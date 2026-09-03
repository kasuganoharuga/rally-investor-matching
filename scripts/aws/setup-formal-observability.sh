#!/usr/bin/env bash
# Install CloudWatch Agent on the formal EC2 host and create matching metric filters.
# Journal lines are mirrored to /var/log/rally/*.log for file-based collection
# (compatible with current amazon-cloudwatch-agent package schemas).
# Usage: ./scripts/aws/setup-formal-observability.sh <ec2-instance-id>
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
INSTANCE_ID="${1:-}"
LOG_GROUP="${LOG_GROUP:-/rally/formal/journal}"
METRIC_NAMESPACE="${METRIC_NAMESPACE:-Rally/Formal}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_CONFIG_SRC="${ROOT_DIR}/infra/observability/cloudwatch-agent-formal.json"

if [[ -z "${INSTANCE_ID}" ]]; then
  echo "Usage: $0 <ec2-instance-id>" >&2
  exit 1
fi
if [[ ! -f "${AGENT_CONFIG_SRC}" ]]; then
  echo "Missing agent config: ${AGENT_CONFIG_SRC}" >&2
  exit 1
fi

aws logs create-log-group --log-group-name "${LOG_GROUP}" --region "${REGION}" 2>/dev/null || true
aws logs put-retention-policy \
  --log-group-name "${LOG_GROUP}" \
  --retention-in-days 30 \
  --region "${REGION}"

B64_CONFIG="$(base64 -w0 < "${AGENT_CONFIG_SRC}" 2>/dev/null || base64 < "${AGENT_CONFIG_SRC}" | tr -d '\n')"
TMP_PARAMS="$(mktemp)"
python3 - "${B64_CONFIG}" > "${TMP_PARAMS}" <<'PY'
import json, sys
b64 = sys.argv[1]
commands = [
    "set -euo pipefail",
    "dnf install -y amazon-cloudwatch-agent 2>/dev/null || yum install -y amazon-cloudwatch-agent",
    "mkdir -p /var/log/rally /opt/aws/amazon-cloudwatch-agent/etc",
    "touch /var/log/rally/rally-api.log /var/log/rally/rally-web.log",
    """cat > /etc/systemd/system/rally-journal-shipper@.service <<'EOF'
[Unit]
Description=Mirror %i journal to /var/log/rally for CloudWatch
After=network-online.target

[Service]
Type=simple
ExecStart=/bin/bash -lc 'journalctl -u %i.service -f -n 200 --no-pager -o short-iso >> /var/log/rally/%i.log'
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF""",
    "systemctl daemon-reload",
    "systemctl enable --now rally-journal-shipper@rally-api",
    "systemctl enable --now rally-journal-shipper@rally-web",
    f"echo {b64} | base64 -d > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json",
    "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s",
    "systemctl is-active amazon-cloudwatch-agent",
    "systemctl is-active rally-journal-shipper@rally-api",
    "systemctl is-active rally-journal-shipper@rally-web",
]
print(json.dumps({"commands": commands}))
PY

COMMAND_ID="$(
  aws ssm send-command \
    --instance-ids "${INSTANCE_ID}" \
    --document-name AWS-RunShellScript \
    --parameters "file://${TMP_PARAMS}" \
    --region "${REGION}" \
    --query 'Command.CommandId' \
    --output text
)"
rm -f "${TMP_PARAMS}"

echo "SSM command: ${COMMAND_ID}"
aws ssm wait command-executed \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --region "${REGION}" || true
aws ssm get-command-invocation \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --region "${REGION}" \
  --query '{Status:Status,Stdout:StandardOutputContent,Stderr:StandardErrorContent}'

put_filter() {
  local name="$1"
  local pattern="$2"
  local metric="$3"
  aws logs put-metric-filter \
    --region "${REGION}" \
    --log-group-name "${LOG_GROUP}" \
    --filter-name "${name}" \
    --filter-pattern "${pattern}" \
    --metric-transformations \
    "metricName=${metric},metricNamespace=${METRIC_NAMESPACE},metricValue=1,defaultValue=0"
}

put_filter "rally-llm-credit-balance" '"error_class=credit_balance"' "LlmCreditBalanceErrors"
put_filter "rally-llm-call-failed" '"llm_call_failed"' "LlmCallFailures"
put_filter "rally-matching-intake-failed" '"matching_intake_failed"' "MatchingIntakeFailures"

echo "Metric filters ready in ${METRIC_NAMESPACE}:"
echo "  LlmCreditBalanceErrors, LlmCallFailures, MatchingIntakeFailures"
echo "Log group: ${LOG_GROUP}"
echo "Create SNS alarms in console when ready."
