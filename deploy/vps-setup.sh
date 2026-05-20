#!/usr/bin/env bash
# One-shot VPS bootstrap for Ubuntu 24.04.
# Run as root:   sudo bash vps-setup.sh
# Idempotent: safe to re-run.

set -euo pipefail

DOMAIN="iot.chandramaautomation.com"
DEPLOY_USER="deploy"
APP_DIR="/opt/ecofarm"
DB_NAME="ecofarm"
DB_USER="ecofarm"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

# ── 1. System packages ──────────────────────────────────────────
apt-get update
apt-get upgrade -y
apt-get install -y \
  ca-certificates curl gnupg ufw fail2ban \
  openjdk-21-jre-headless \
  postgresql postgresql-contrib \
  mosquitto mosquitto-clients \
  nginx certbot python3-certbot-nginx

# ── 2. Firewall ─────────────────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 1883/tcp    # MQTT (close later if you only use TLS on 8883)
# ufw allow 8883/tcp  # uncomment when you set up MQTT TLS
ufw --force enable

# ── 3. Deploy user ──────────────────────────────────────────────
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
mkdir -p "/home/$DEPLOY_USER/.ssh"
chmod 700 "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"

echo
echo ">>> Paste the PUBLIC key for the GitHub Actions deploy keypair, then Ctrl-D:"
echo ">>> (skip with empty input if you've already added it manually)"
PUBKEY=$(cat || true)
if [[ -n "${PUBKEY// }" ]]; then
  grep -qxF "$PUBKEY" "/home/$DEPLOY_USER/.ssh/authorized_keys" || \
    echo "$PUBKEY" >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

# Sudoers: deploy user can ONLY restart ecofarm + reload nginx
cat > /etc/sudoers.d/ecofarm-deploy <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /bin/systemctl restart ecofarm, /bin/systemctl reload nginx, /bin/systemctl status ecofarm
EOF
chmod 440 /etc/sudoers.d/ecofarm-deploy
visudo -cf /etc/sudoers.d/ecofarm-deploy

# ── 4. App directories ──────────────────────────────────────────
mkdir -p "$APP_DIR"/{app,ui,config,logs}
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
chmod 750 "$APP_DIR/config"

# ── 5. PostgreSQL ───────────────────────────────────────────────
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# ── 6. Mosquitto (basic auth, no TLS yet) ──────────────────────
MQTT_USER="ecofarm"
MQTT_PASS=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
if [[ ! -f /etc/mosquitto/passwd ]]; then
  touch /etc/mosquitto/passwd
  chown mosquitto:mosquitto /etc/mosquitto/passwd
  chmod 600 /etc/mosquitto/passwd
fi
mosquitto_passwd -b /etc/mosquitto/passwd "$MQTT_USER" "$MQTT_PASS"

cat > /etc/mosquitto/conf.d/ecofarm.conf <<'EOF'
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
persistence true
persistence_location /var/lib/mosquitto/
log_dest file /var/log/mosquitto/mosquitto.log
EOF

systemctl enable mosquitto
systemctl restart mosquitto

# ── 7. systemd unit for backend ────────────────────────────────
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

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable ecofarm

# ── 8. application.yml (only created if missing) ───────────────
if [[ ! -f "$APP_DIR/config/application.yml" ]]; then
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
    broker-url: tcp://127.0.0.1:1883
    client-id: ecofarm-backend
    username: $MQTT_USER
    password: "$MQTT_PASS"
    qos: 1
  cors:
    allowed-origins: https://$DOMAIN
EOF
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/config/application.yml"
  chmod 600 "$APP_DIR/config/application.yml"
fi

# ── 9. Nginx ───────────────────────────────────────────────────
cat > /etc/nginx/sites-available/ecofarm <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend (React build)
    root $APP_DIR/ui;
    index index.html;

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    # WebSocket (STOMP)
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

    # Actuator restricted to localhost (deploy script hits it via curl)
    location /actuator/ {
        allow 127.0.0.1;
        deny all;
        proxy_pass http://127.0.0.1:8080;
    }

    client_max_body_size 10M;
}
EOF
ln -sf /etc/nginx/sites-available/ecofarm /etc/nginx/sites-enabled/ecofarm
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ── 10. Final notes ─────────────────────────────────────────────
echo
echo "════════════════════════════════════════════════════════════"
echo " Bootstrap complete."
echo
echo " DB password:    $DB_PASS"
echo " MQTT user:      $MQTT_USER"
echo " MQTT password:  $MQTT_PASS"
echo
echo " (Also stored in $APP_DIR/config/application.yml — chmod 600)"
echo
echo " NEXT STEPS:"
echo " 1. Point DNS A record:  $DOMAIN  →  $(curl -s ifconfig.me || echo this-vps-ip)"
echo " 2. After DNS resolves, run:"
echo "      sudo certbot --nginx -d $DOMAIN --redirect --agree-tos -m you@example.com"
echo " 3. From GitHub, trigger the deploy workflow (push to prod)."
echo " 4. After first deploy, log into the UI with the seeded super-admin"
echo "    and immediately change the password."
echo "════════════════════════════════════════════════════════════"
