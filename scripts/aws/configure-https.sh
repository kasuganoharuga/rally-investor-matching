#!/usr/bin/env bash

set -euo pipefail

public_web_url="${RALLY_PUBLIC_WEB_URL:-}"
if [[ ! "$public_web_url" =~ ^https://([a-zA-Z0-9.-]+)$ ]]; then
  echo "RALLY_PUBLIC_WEB_URL must be an HTTPS origin without a path: $public_web_url" >&2
  exit 1
fi

public_hostname="${BASH_REMATCH[1]}"
certificate_path="/etc/letsencrypt/live/$public_hostname/fullchain.pem"
certbot_root="/opt/rally-certbot"
challenge_root="/var/lib/letsencrypt"
nginx_config="/etc/nginx/conf.d/rally.conf"

dnf install -y nginx python3.11 python3.11-pip
mkdir -p "$challenge_root/.well-known/acme-challenge"

if [[ ! -x "$certbot_root/bin/certbot" ]]; then
  python3.11 -m venv "$certbot_root"
  "$certbot_root/bin/python" -m pip install --upgrade pip certbot
fi

cat > "$nginx_config" <<EOF
server {
    listen 80;
    server_name $public_hostname;

    location ^~ /.well-known/acme-challenge/ {
        root $challenge_root;
        default_type text/plain;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

nginx -t
systemctl enable nginx.service
systemctl restart nginx.service

if [[ ! -f "$certificate_path" ]]; then
  "$certbot_root/bin/certbot" certonly \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --webroot \
    --webroot-path "$challenge_root" \
    --domain "$public_hostname"
fi

cat > "$nginx_config" <<EOF
server {
    listen 80;
    server_name $public_hostname;

    location ^~ /.well-known/acme-challenge/ {
        root $challenge_root;
        default_type text/plain;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $public_hostname;

    ssl_certificate /etc/letsencrypt/live/$public_hostname/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$public_hostname/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 25m;
    add_header Content-Security-Policy "frame-ancestors https://rallyroadmap.com https://www.rallyroadmap.com" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

cat > /usr/local/sbin/reload-rally-nginx.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
nginx -t
systemctl reload nginx.service
EOF
chmod 0755 /usr/local/sbin/reload-rally-nginx.sh

cat > /etc/systemd/system/rally-cert-renew.service <<EOF
[Unit]
Description=Renew Rally TLS certificate
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$certbot_root/bin/certbot renew --quiet --deploy-hook /usr/local/sbin/reload-rally-nginx.sh
EOF

cat > /etc/systemd/system/rally-cert-renew.timer <<'EOF'
[Unit]
Description=Check Rally TLS certificate renewal daily

[Timer]
OnCalendar=*-*-* 03:15:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

nginx -t
systemctl daemon-reload
systemctl enable --now rally-cert-renew.timer
systemctl restart nginx.service

echo "Rally HTTPS is configured for $public_web_url"
