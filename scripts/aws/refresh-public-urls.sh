#!/usr/bin/env bash

set -euo pipefail

web_env_file="${RALLY_WEB_ENV_FILE:-/etc/rally/web.env}"
api_env_file="${RALLY_API_ENV_FILE:-/etc/rally/api.env}"
imds_base_url="${RALLY_IMDS_BASE_URL:-http://169.254.169.254}"

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

imds_token=$(curl --fail --silent --show-error --max-time 5 \
  --retry 12 --retry-delay 5 --retry-all-errors \
  -X PUT \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 300' \
  "$imds_base_url/latest/api/token")
public_ipv4=$(curl --fail --silent --show-error --max-time 5 \
  --retry 12 --retry-delay 5 --retry-all-errors \
  -H "X-aws-ec2-metadata-token: $imds_token" \
  "$imds_base_url/latest/meta-data/public-ipv4")
public_hostname=$(curl --fail --silent --show-error --max-time 5 \
  --retry 3 --retry-delay 2 --retry-all-errors \
  -H "X-aws-ec2-metadata-token: $imds_token" \
  "$imds_base_url/latest/meta-data/public-hostname" || true)

if [[ -z "$public_ipv4" ]]; then
  echo "EC2 metadata did not return a public IPv4 address." >&2
  exit 1
fi

public_web_url="http://${public_ipv4}:3000"
public_api_url="http://${public_ipv4}:8000"

set -a
# shellcheck disable=SC1090
. "$web_env_file"
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

upsert_env_value "$web_env_file" BETTER_AUTH_URL "$resolved_app_base_url"
upsert_env_value "$web_env_file" BETTER_AUTH_TRUSTED_ORIGINS "$trusted_origins"
upsert_env_value "$web_env_file" APP_BASE_URL "$resolved_app_base_url"
upsert_env_value "$web_env_file" NEXT_PUBLIC_MATCHING_API_BASE_URL "$resolved_api_url"
upsert_env_value "$api_env_file" CORS_ORIGINS "$cors_origins"

echo "Refreshed Rally public URLs for $public_web_url"
