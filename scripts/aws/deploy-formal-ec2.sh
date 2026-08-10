#!/usr/bin/env bash

set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Required environment variable is missing: $name" >&2
    exit 1
  fi
}

require_env RALLY_RELEASE_SHA
require_env RALLY_RELEASE_BRANCH
require_env RALLY_SOURCE_BUCKET
require_env RALLY_SOURCE_KEY

if [[ ! "$RALLY_RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "RALLY_RELEASE_SHA must be a full Git commit SHA." >&2
  exit 1
fi

release_root="/opt/rally-releases"
release_dir="$release_root/$RALLY_RELEASE_SHA"
current_link="/opt/rally-current"
archive_path="/tmp/rally-formal-$RALLY_RELEASE_SHA.zip"
deploy_marker="$release_dir/.rally-deploy-complete"

if [[ "$release_dir" != "$release_root/"* ]]; then
  echo "Unsafe release path: $release_dir" >&2
  exit 1
fi

mkdir -p "$release_root"
exec 9>/var/lock/rally-formal-deploy.lock
if ! flock -n 9; then
  echo "Another Rally deployment is already running." >&2
  exit 1
fi

cleanup_archive() {
  rm -f "$archive_path"
}
trap cleanup_archive EXIT

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

upsert_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local temp_file

  if [[ ! "$key" =~ ^[A-Z0-9_]+$ ]]; then
    echo "Unsafe environment key: $key" >&2
    exit 1
  fi
  if [[ ! -f "$file" ]]; then
    echo "Environment file is missing: $file" >&2
    exit 1
  fi

  temp_file=$(mktemp "${file}.tmp.XXXXXX")
  grep -v "^${key}=" "$file" > "$temp_file" || true
  printf '%s=%s\n' "$key" "$(shell_quote "$value")" >> "$temp_file"
  chmod --reference="$file" "$temp_file"
  chown --reference="$file" "$temp_file"
  mv -f "$temp_file" "$file"
}

is_ephemeral_ec2_url() {
  local url="$1"
  [[ "$url" =~ ^http://([0-9]{1,3}\.){3}[0-9]{1,3}:(3000|8000)/?$ ]] ||
    [[ "$url" =~ ^http://ec2-[a-zA-Z0-9.-]+\.compute\.amazonaws\.com:(3000|8000)/?$ ]]
}

refresh_public_urls() {
  local imds_token
  local public_ipv4
  local public_hostname
  local public_web_url
  local public_api_url
  local configured_app_base_url
  local configured_api_url
  local resolved_app_base_url
  local resolved_api_url
  local trusted_origins
  local cors_origins
  local -a web_origins

  imds_token=$(curl --fail --silent --show-error --max-time 5 \
    -X PUT \
    -H 'X-aws-ec2-metadata-token-ttl-seconds: 300' \
    http://169.254.169.254/latest/api/token)
  public_ipv4=$(curl --fail --silent --show-error --max-time 5 \
    -H "X-aws-ec2-metadata-token: $imds_token" \
    http://169.254.169.254/latest/meta-data/public-ipv4)
  public_hostname=$(curl --fail --silent --show-error --max-time 5 \
    -H "X-aws-ec2-metadata-token: $imds_token" \
    http://169.254.169.254/latest/meta-data/public-hostname || true)

  if [[ -z "$public_ipv4" ]]; then
    echo "EC2 metadata did not return a public IPv4 address." >&2
    exit 1
  fi

  public_web_url="http://${public_ipv4}:3000"
  public_api_url="http://${public_ipv4}:8000"

  set -a
  # shellcheck disable=SC1091
  . /etc/rally/web.env
  set +a
  configured_app_base_url="${APP_BASE_URL:-}"
  configured_api_url="${NEXT_PUBLIC_MATCHING_API_BASE_URL:-}"

  resolved_app_base_url="$configured_app_base_url"
  if [[ -z "$resolved_app_base_url" ]] || is_ephemeral_ec2_url "$resolved_app_base_url"; then
    resolved_app_base_url="$public_web_url"
  fi

  resolved_api_url="$configured_api_url"
  if [[ -z "$resolved_api_url" ]] || is_ephemeral_ec2_url "$resolved_api_url"; then
    resolved_api_url="$public_api_url"
  fi

  web_origins=("$resolved_app_base_url" "$public_web_url")
  if [[ -n "$public_hostname" ]]; then
    web_origins+=("http://${public_hostname}:3000")
  fi
  trusted_origins=$(IFS=,; printf '%s' "${web_origins[*]}")
  cors_origins=$(printf '%s\n' "${web_origins[@]}" \
    | jq -Rsc 'split("\n") | map(select(length > 0)) | unique')

  upsert_env_value /etc/rally/web.env BETTER_AUTH_URL "$resolved_app_base_url"
  upsert_env_value /etc/rally/web.env BETTER_AUTH_TRUSTED_ORIGINS "$trusted_origins"
  upsert_env_value /etc/rally/web.env APP_BASE_URL "$resolved_app_base_url"
  upsert_env_value /etc/rally/web.env NEXT_PUBLIC_MATCHING_API_BASE_URL "$resolved_api_url"
  upsert_env_value /etc/rally/api.env CORS_ORIGINS "$cors_origins"

  echo "Refreshed Rally public URLs for $public_web_url"
}

refresh_public_urls

available_kb=$(df --output=avail /opt | tail -1 | tr -d ' ')
if ((available_kb < 1500000)); then
  echo "At least 1.5 GB of free disk space is required; available KB: $available_kb" >&2
  exit 1
fi

if [[ ! -f "$release_dir/.rally-release-sha" ]]; then
  echo "Release bundle is missing its commit marker." >&2
  exit 1
fi

bundle_sha=$(tr -d '[:space:]' < "$release_dir/.rally-release-sha")
if [[ "$bundle_sha" != "$RALLY_RELEASE_SHA" ]]; then
  echo "Release bundle SHA does not match the requested commit." >&2
  exit 1
fi

if [[ ! -f "$deploy_marker" ]]; then
  echo "Preparing Rally release $RALLY_RELEASE_SHA"
  cp /etc/rally/web.env "$release_dir/apps/web/.env.local"

  python3.11 -m venv "$release_dir/.venv"
  "$release_dir/.venv/bin/python" -m pip install --upgrade pip
  "$release_dir/.venv/bin/python" -m pip install -e "$release_dir"
  "$release_dir/.venv/bin/python" -m pip install -r "$release_dir/apps/api/requirements.txt"

  cd "$release_dir"
  pnpm install --frozen-lockfile
  set -a
  # shellcheck disable=SC1091
  . /etc/rally/web.env
  set +a
  RALLY_DEPLOY_SKIP_TYPECHECK=1 \
    pnpm --filter @rally-investor-matching/web build
  touch "$deploy_marker"
fi

if [[ -L "$current_link" ]]; then
  previous_release=$(readlink -f "$current_link")
else
  previous_release="/opt/rally"
fi

write_service_units() {
  cat > /etc/systemd/system/rally-api.service <<'EOF'
[Unit]
Description=Rally FastAPI matching service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/rally-current/apps/api
EnvironmentFile=/etc/rally/api.env
ExecStart=/opt/rally-current/.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/rally-web.service <<'EOF'
[Unit]
Description=Rally Next.js web service
After=network-online.target rally-api.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/rally-current/apps/web
EnvironmentFile=/etc/rally/web.env
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
ExecStart=/usr/bin/pnpm exec next start -H 0.0.0.0 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

activate_release() {
  local target="$1"
  rm -f "$current_link.new"
  ln -s "$target" "$current_link.new"
  mv -Tf "$current_link.new" "$current_link"
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-30}"
  for _ in $(seq 1 "$attempts"); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

rollback() {
  echo "Deployment health check failed; rolling back to $previous_release" >&2
  activate_release "$previous_release"
  systemctl daemon-reload
  systemctl restart rally-api.service
  systemctl restart rally-web.service
  wait_for_url http://127.0.0.1:8000/health 30 || true
  wait_for_url http://127.0.0.1:3000 30 || true
}

write_service_units
activate_release "$release_dir"
systemctl daemon-reload

if ! systemctl restart rally-api.service; then
  rollback
  exit 1
fi
if ! wait_for_url http://127.0.0.1:8000/health 45; then
  journalctl -u rally-api.service --no-pager -n 80 >&2
  rollback
  exit 1
fi

if ! systemctl restart rally-web.service; then
  rollback
  exit 1
fi
if ! wait_for_url http://127.0.0.1:3000 45; then
  journalctl -u rally-web.service --no-pager -n 80 >&2
  rollback
  exit 1
fi

deployed_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "$release_dir/deploy-info.json" <<EOF
{
  "commit": "$RALLY_RELEASE_SHA",
  "branch": "$RALLY_RELEASE_BRANCH",
  "deployed_at": "$deployed_at",
  "source": "s3://$RALLY_SOURCE_BUCKET/$RALLY_SOURCE_KEY"
}
EOF

active_release=$(readlink -f "$current_link")
while IFS= read -r stale_release; do
  [[ -z "$stale_release" ]] && continue
  [[ "$stale_release" == "$active_release" ]] && continue
  [[ "$stale_release" == "$previous_release" ]] && continue
  rm -rf "$stale_release"
done < <(
  find "$release_root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr \
    | tail -n +4 \
    | cut -d' ' -f2-
)

echo "Rally release $RALLY_RELEASE_SHA is healthy and active."
