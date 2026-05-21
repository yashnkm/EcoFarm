#!/usr/bin/env bash
# VPS bootstrap — tailored for this VPS (Ubuntu 22.04, existing Postgres 14
# + Nginx 1.18 + Mosquitto on 1884, other sites running).
#
# Idempotent. Run as root:   sudo bash vps-setup.sh

set -euo pipefail

DOMAIN="iot.chandramaautomation.com"
DEPLOY_USER="deploy"
APP_DIR="/opt/ecofarm"
DB_NAME="ecofarm"
DB_USER="ecofarm"

# Loopback to local Mosquitto on port 1884 (the broker is on this same VPS)
MQTT_SEED_URL="tcp://127.0.0.1:1884"
MQTT_SEED_USER="trb145"
MQTT_SEED_PASS="trb1234"

# Public key generated on this VPS earlier (ssh-keygen -f ~/.ssh/ecofarm_deploy)
DEPLOY_PUBKEY_FILE="/root/.ssh/ecofarm_deploy.pub"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

# Verbose mode so we can see exactly what runs
set -x

# Fully non-interactive apt — no dialogs, keep existing conf files
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
APT="apt-get -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold"

# ── 1. Install only what's missing (Java 21 + Certbot) ──────────
#    Postgres / Nginx / Mosquitto are already installed and in use.
#    Skipping apt upgrade to avoid disturbing other services on this box.
echo "[1/8] apt-get update..."
$APT update
echo "[1/8] installing Java 21 + Certbot..."
$APT install --no-install-recommends openjdk-21-jre-headless certbot python3-certbot-nginx

# ── 2. Drop ecofarmlogix (no longer needed) ─────────────────────
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ecofarmlogix;" || true
rm -f /etc/nginx/sites-enabled/ecofarmlogix
rm -f /etc/nginx/sites-available/ecofarmlogix

# ── 3. Create ecofarm DB + user ─────────────────────────────────
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
EXISTING=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" || true)
if [[ "$EXISTING" == "1" ]]; then
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
else
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# ── 4. Deploy user + SSH key (key already at $DEPLOY_PUBKEY_FILE) ─
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
mkdir -p "/home/$DEPLOY_USER/.ssh"
chmod 700 "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

if [[ -f "$DEPLOY_PUBKEY_FILE" ]]; then
  PUBKEY=$(cat "$DEPLOY_PUBKEY_FILE")
  grep -qxF "$PUBKEY" "/home/$DEPLOY_USER/.ssh/authorized_keys" || \
    echo "$PUBKEY" >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
else
  echo "WARNING: $DEPLOY_PUBKEY_FILE not found — you'll need to add the deploy public key manually."
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"

cat > /etc/sudoers.d/ecofarm-deploy <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /bin/systemctl restart ecofarm, /bin/systemctl reload nginx, /bin/systemctl status ecofarm
EOF
chmod 440 /etc/sudoers.d/ecofarm-deploy
visudo -cf /etc/sudoers.d/ecofarm-deploy

# ── 5. App directories ──────────────────────────────────────────
mkdir -p "$APP_DIR"/{app,ui,config,logs}
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
chmod 750 "$APP_DIR/config"

# ── 6. systemd unit for backend ─────────────────────────────────
cat > /etc/systemd/system/ecofarm.service <<EOF
[Unit]
Description=ecoFarm Spring Boot backend
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/java -Xms256m -Xmx768m -jar $APP_DIR/app/ecoFarm.jar \\
  --spring.config.additional-location=optional:file:$APP_DIR/config/application.yml
Restart=on-failure
RestartSec=5
SuccessExitStatus=143
StandardOutput=append:$APP_DIR/logs/app.log
StandardError=append:$APP_DIR/logs/app.log
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable ecofarm

# ── 7. application.yml (always rewrite so the new DB pass takes effect) ─
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
cat > "$APP_DIR/config/application.yml" <<EOF
server:
  port: 8080
  forward-headers-strategy: framework

spring:
  datasource:
    url: jdbc:postgresql://127.0.0.1:5432/$DB_NAME
    username: $DB_USER
    password: "$DB_PASS"
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false

app:
  jwt:
    secret: "$JWT_SECRET"
    expiry-ms: 900000
    refresh-expiry-ms: 604800000
  mqtt:
    broker-url: "$MQTT_SEED_URL"
    client-id: ecofarm-backend
    username: "$MQTT_SEED_USER"
    password: "$MQTT_SEED_PASS"
    qos: 1
  cors:
    allowed-origins: https://$DOMAIN
EOF
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/config/application.yml"
chmod 600 "$APP_DIR/config/application.yml"

# ── 8. Nginx server block (does NOT touch other sites) ──────────
cat > /etc/nginx/sites-available/iot.chandramaautomation.com <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    root $APP_DIR/ui;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
    }

    location /actuator/ {
        allow 127.0.0.1;
        deny all;
        proxy_pass http://127.0.0.1:8080;
    }

    client_max_body_size 10M;
}
EOF
ln -sf /etc/nginx/sites-available/iot.chandramaautomation.com /etc/nginx/sites-enabled/iot.chandramaautomation.com
nginx -t
systemctl reload nginx

# ── 9. Final summary ────────────────────────────────────────────
echo
echo "════════════════════════════════════════════════════════════"
echo " Setup complete."
echo
echo " DB password (also written to $APP_DIR/config/application.yml):"
echo "   $DB_PASS"
echo
echo " Enabled Nginx sites (other sites unaffected):"
ls /etc/nginx/sites-enabled/
echo
echo " NEXT STEPS:"
echo " 1. Point DNS A record:"
echo "      $DOMAIN  →  $(curl -s ifconfig.me || hostname -I | awk '{print \$1}')"
echo " 2. After DNS resolves (check with: dig +short $DOMAIN), run:"
echo "      sudo certbot --nginx -d $DOMAIN --redirect --agree-tos -m you@example.com"
echo " 3. Print the deploy PRIVATE key — copy to a SAFE place (GitHub Secret VPS_SSH_KEY):"
echo "      cat /root/.ssh/ecofarm_deploy"
echo " 4. Print the PUBLIC IP — for the GitHub Secret VPS_HOST:"
echo "      curl -s ifconfig.me"
echo "════════════════════════════════════════════════════════════"
