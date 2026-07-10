#!/usr/bin/env bash
set -u

REGION="${AWS_REGION:-ap-southeast-2}"
STACK_NAME="${STACK_NAME:-vcmi-core-dev}"
PROJECT_SLUG="${PROJECT_SLUG:-vcmi}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

PASS=0
FAIL=0

check() {
  local label="$1"
  shift
  echo
  echo "==> $label"
  if "$@"; then
    echo "PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label"
    FAIL=$((FAIL + 1))
  fi
}

echo "VC Match Intelligence AWS permission check"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"

CALLER_ARN="$(aws sts get-caller-identity --query Arn --output text 2>/dev/null || true)"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"

echo
echo "Caller ARN: ${CALLER_ARN:-unknown}"
echo "Account ID: ${ACCOUNT_ID:-unknown}"

check "CloudFormation stack read" \
  aws cloudformation describe-stacks \
    --region "$REGION" \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].StackStatus" \
    --output text

RAW_BUCKET="$(aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='RawRecordsBucketName'].OutputValue | [0]" \
  --output text 2>/dev/null || true)"

ARTIFACTS_BUCKET="$(aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='ArtifactsBucketName'].OutputValue | [0]" \
  --output text 2>/dev/null || true)"

echo
echo "Raw bucket: ${RAW_BUCKET:-unknown}"
echo "Artifacts bucket: ${ARTIFACTS_BUCKET:-unknown}"

if [[ -n "${RAW_BUCKET:-}" && "$RAW_BUCKET" != "None" ]]; then
  check "S3 raw bucket list" aws s3 ls "s3://$RAW_BUCKET/"
fi

if [[ -n "${ARTIFACTS_BUCKET:-}" && "$ARTIFACTS_BUCKET" != "None" ]]; then
  check "S3 artifacts bucket list" aws s3 ls "s3://$ARTIFACTS_BUCKET/"
fi

check "SSM read database_url parameter" \
  aws ssm get-parameter \
    --region "$REGION" \
    --name "/${PROJECT_SLUG}/${ENVIRONMENT}/database_url" \
    --query "Parameter.Name" \
    --output text

check "Bedrock list foundation models" \
  aws bedrock list-foundation-models \
    --region "$REGION" \
    --by-provider Amazon \
    --query "modelSummaries[?modelId=='amazon.titan-embed-text-v2:0'].modelId | [0]" \
    --output text

check "RDS describe DB instances" \
  aws rds describe-db-instances \
    --region "$REGION" \
    --max-records 20 \
    --query "length(DBInstances)" \
    --output text

check "RDS describe DB subnet groups" \
  aws rds describe-db-subnet-groups \
    --region "$REGION" \
    --query "length(DBSubnetGroups)" \
    --output text

check "EC2 describe VPCs" \
  aws ec2 describe-vpcs \
    --region "$REGION" \
    --query "length(Vpcs)" \
    --output text

check "EC2 describe subnets" \
  aws ec2 describe-subnets \
    --region "$REGION" \
    --query "length(Subnets)" \
    --output text

check "Secrets Manager list secrets" \
  aws secretsmanager list-secrets \
    --region "$REGION" \
    --max-results 5 \
    --query "length(SecretList)" \
    --output text

echo
echo "Summary: $PASS passed, $FAIL failed"

if [[ "$FAIL" -gt 0 ]]; then
  echo "Some checks failed. This does not always block the MVP, but failed RDS/EC2 checks will block database creation."
  exit 1
fi

echo "All non-mutating permission checks passed."
