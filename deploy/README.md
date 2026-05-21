# Deployment — Hostinger VPS

Target: **Ubuntu 24.04**, domain **iot.chandramaautomation.com**, branch **`prod`**.

## Repo layout

```
EcoFarm/
├── ecoFarm/                  ← Spring Boot backend
├── ecofarm-ui/               ← React frontend
├── deploy/                   ← this folder
└── .github/workflows/deploy.yml
```

The workflow does `working-directory: ecoFarm` and `working-directory: ecofarm-ui`.

---

## One-time setup

### 1. DNS

Point an **A record** for `iot.chandramaautomation.com` at your VPS IP.

### 2. Generate a deploy keypair (on your local machine)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ecofarm_deploy -C "github-actions"
```

This produces `ecofarm_deploy` (private) and `ecofarm_deploy.pub` (public).

### 3. Bootstrap the VPS

SSH in as `root` (or with sudo), upload `deploy/vps-setup.sh`, run it:

```bash
scp deploy/vps-setup.sh root@<vps-ip>:/root/
ssh root@<vps-ip>
chmod +x /root/vps-setup.sh
/root/vps-setup.sh
```

When it prompts for the deploy public key, paste the contents of `ecofarm_deploy.pub` then press Ctrl-D.

The script installs **app dependencies only** (Java 21, PostgreSQL, Nginx, Certbot). MQTT broker (Mosquitto) is intentionally skipped — the backend keeps using your existing external broker until you decide to self-host one.

The script prints the DB password at the end and saves it into `/opt/ecofarm/config/application.yml`. **Note it down** in your password manager.

### 4. Get an SSL cert

After DNS resolves:

```bash
sudo certbot --nginx -d iot.chandramaautomation.com --redirect --agree-tos -m you@example.com
```

### 5. Add GitHub secrets

In the repo **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP or `iot.chandramaautomation.com` |
| `VPS_USER` | `deploy` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | full contents of `~/.ssh/ecofarm_deploy` (the **private** key, including `-----BEGIN/END-----` lines) |

---

## Deploying

```bash
git checkout prod
git merge main      # or whatever branch holds your changes
git push origin prod
```

GitHub Actions builds backend + frontend, uploads artifacts to `/opt/ecofarm/`, swaps them atomically, restarts the backend, and reloads Nginx. Total: ~2–3 minutes.

Watch progress in the Actions tab. The final step waits for `/actuator/health` to return 200 before declaring success.

### Manual trigger

Actions tab → **Deploy to VPS** → **Run workflow** → `prod`.

---

## Operations

| Task | Command (on VPS as `deploy`) |
|---|---|
| Tail logs | `tail -f /opt/ecofarm/logs/app.log` |
| Restart backend | `sudo systemctl restart ecofarm` |
| Backend status | `sudo systemctl status ecofarm` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Nginx logs | `sudo tail -f /var/log/nginx/error.log` |
| Mosquitto logs | `sudo tail -f /var/log/mosquitto/mosquitto.log` |
| Edit config | `sudo nano /opt/ecofarm/config/application.yml` (then restart) |
| DB shell | `sudo -u postgres psql ecofarm` |

---

## File locations

```
/opt/ecofarm/
  app/ecoFarm.jar              ← uploaded by CI
  ui/                          ← frontend dist, uploaded by CI
  config/application.yml       ← secrets, NOT in git
  logs/app.log                 ← stdout/stderr
  ui-old/                      ← previous UI release (kept for quick rollback)

/etc/systemd/system/ecofarm.service
/etc/nginx/sites-available/ecofarm
/etc/mosquitto/conf.d/ecofarm.conf
/etc/sudoers.d/ecofarm-deploy
```

## Rolling back

If a deploy goes wrong, on the VPS:

```bash
# UI rollback
sudo rm -rf /opt/ecofarm/ui
sudo mv /opt/ecofarm/ui-old /opt/ecofarm/ui
sudo systemctl reload nginx

# Backend rollback: redeploy the previous commit by re-running the workflow
# against an older commit, or keep a versioned copy of the jar.
```

---

## Security hardening to do after first deploy

- [ ] Disable root SSH login (`PermitRootLogin no` in `/etc/ssh/sshd_config`)
- [ ] Disable password auth (`PasswordAuthentication no`) — only after confirming key auth works
- [ ] Set up MQTT TLS on port 8883 (move gateways off plain 1883)
- [ ] Configure backups — at minimum `pg_dump` to off-site weekly
- [ ] Set up log rotation for `/opt/ecofarm/logs/app.log` (logrotate snippet)
