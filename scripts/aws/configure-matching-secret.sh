#!/usr/bin/env bash

# Never trace generated or existing credentials, even if invoked with bash -x.
set +x
set -euo pipefail
umask 077

web_env_file="${RALLY_WEB_ENV_FILE:-/etc/rally/web.env}"
api_env_file="${RALLY_API_ENV_FILE:-/etc/rally/api.env}"
secret_key="RALLY_MATCHING_API_SECRET"
python_bin="${RALLY_PYTHON_BIN:-python3.11}"

read_secret() {
  local file="$1"
  local value
  local -a matches
  if [[ ! -f "$file" ]]; then
    echo "Required Rally environment file is missing." >&2
    exit 1
  fi
  mapfile -t matches < <(grep "^${secret_key}=" "$file" || true)
  if ((${#matches[@]} > 1)); then
    echo "Duplicate matching credential configuration; resolve before deployment." >&2
    exit 1
  fi
  value="${matches[0]:-}"
  value="${value#${secret_key}=}"
  # Support both bare and shell-quoted values without sourcing arbitrary env.
  if [[ "$value" == \"*\" || "$value" == \'*\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  if [[ -n "$value" ]] && [[ ! "$value" =~ ^[a-zA-Z0-9_-]{32,128}$ ]]; then
    echo "Invalid matching credential configuration; use a 32+ character token." >&2
    exit 1
  fi
  if [[ "$value" == "rally-local-only-matching-key-change-for-deployment" ]]; then
    echo "Local-development matching credential must not be used on AWS." >&2
    exit 1
  fi
  printf '%s' "$value"
}

write_secret() {
  local file="$1"
  local temp_file
  temp_file=$(mktemp "${file}.tmp.XXXXXX")
  grep -v "^${secret_key}=" "$file" > "$temp_file" || true
  printf '%s=%s\n' "$secret_key" "$matching_secret" >> "$temp_file"
  chmod --reference="$file" "$temp_file"
  chown --reference="$file" "$temp_file"
  mv -f "$temp_file" "$file"
}

web_secret=$(read_secret "$web_env_file")
api_secret=$(read_secret "$api_env_file")
if [[ -n "$web_secret" && -n "$api_secret" && "$web_secret" != "$api_secret" ]]; then
  echo "Web/API matching credentials differ; resolve before deployment." >&2
  exit 1
fi
matching_secret="${web_secret:-$api_secret}"
if [[ -z "$matching_secret" ]]; then
  matching_secret=$("$python_bin" -c 'import secrets; print(secrets.token_hex(32))')
fi
write_secret "$web_env_file"
write_secret "$api_env_file"
unset matching_secret web_secret api_secret
echo "Rally matching server credential configured (value hidden)."
