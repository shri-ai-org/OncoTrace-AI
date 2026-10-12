# Deploying OncoTrace-AI (AWS EC2 t3.large, Ubuntu 24.04, nginx)

| Piece | Where it runs |
|---|---|
| React site (`client/`) | Built to static files in `/var/www/oncotraceai`, served by nginx |
| Analysis API (`server/`) | uvicorn on `127.0.0.1:8000` under systemd, reverse-proxied at `/api/` |
| Secrets | `/etc/oncotrace/env` (root-only, never in git) |

The examples assume the repo is cloned at `/home/anand/OncoTrace-AI` and deployed
by the login user `anand`; the backend itself runs as the dedicated system user
`oncotrace` (created below). Substitute your own paths everywhere, including
inside `oncotrace-backend.service`.

---

## Routine update (every deploy)

```bash
cd /home/anand/OncoTrace-AI && git pull

# Frontend
cd client
npm ci                      # installs build tools too; do NOT use --omit=dev
npm run build               # client + SSR build, prerendered homepage, sitemap, .gz/.br
# New hashed assets first, never deleting old ones (a tab opened before this
# deploy may still request them), then everything else incl. index.html last.
sudo rsync -a dist/assets/ /var/www/oncotraceai/assets/
sudo rsync -a --delete --exclude 'assets/' dist/ /var/www/oncotraceai/
sudo systemctl reload nginx  # graceful; drops nginx's 60s open-file cache so the new index.html is served at once
# Then delete hashed assets older than the build this one replaced (see below).
sudo bash ../server/deploy/prune-assets.sh dist/assets /var/www/oncotraceai/assets

# Backend: only if anything under server/ changed
cd ../server
.venv/bin/pip install -r requirements.txt
sudo systemctl restart oncotrace-backend
```

**Asset pruning** (`prune-assets.sh`) keeps exactly two builds in
`/var/www/oncotraceai/assets/`: the one just shipped and the one it replaced
(so a tab opened before this deploy can still lazy-load its chunks). It decides
by file name against `dist/assets`, never by age: `rsync -a` keeps build-time
mtimes, so an age-based `find -mtime +30 -delete` deletes the live bundle on a
site that hasn't been redeployed for a month. The script records each build's
file list in `/var/lib/oncotrace-web/`, prunes nothing on its first run, is
safe to re-run, and refuses to run (deleting nothing) if `dist/assets` is empty
or hasn't been rsynced yet.

### Rollback

Tag each deploy before running the steps above, so there is always a known-good
commit to return to:

```bash
cd /home/anand/OncoTrace-AI && git tag "deploy-$(date +%Y%m%d-%H%M)"
```

To roll back, check out the last good tag (`git tag -l 'deploy-*'`) and run the
routine update from `# Frontend` on, plus the backend steps if `server/`
changed between the two:

```bash
cd /home/anand/OncoTrace-AI && git checkout deploy-YYYYMMDD-HHMM
# ...the Frontend (and Backend) steps above, unchanged...
```

`prune-assets.sh` treats the older build like any new one: it becomes the
current build and the faulty one the previous build, so tabs opened on the
faulty build keep working. Before the next routine update, return to the
branch with `git checkout main`, or `git pull` fails on the detached checkout.

Not in git, so back them up separately: `/etc/oncotrace/env` (root-only;
re-create from `server/.env.example` if lost, with a new demo password), the
nginx config (`sudo nginx -T` output, see step 2), and `server/resources/`
(re-downloadable with `scripts/download_references.sh`).

---

### What the build produces

- `dist/index.html`: the homepage, **prerendered** (real markup, hydrated by React). nginx serves it only at `/`.
- `dist/app.html`: the empty app shell, served for every other route (`/blog`, `/Book-LB`, `/mammo-demo`, `/demo`, 404s).
- Ship the files first, then reload nginx (the routine steps above already do both).

## One-time setup

### 1. Backend service

```bash
cd /home/anand/OncoTrace-AI/server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Service account: no login, no home, owns nothing. The backend parses
# untrusted uploads, so it must not run as the deploy user (whose SSH keys,
# git credentials and home directory it could otherwise reach).
sudo useradd --system --user-group --no-create-home --home-dir /nonexistent \
    --shell /usr/sbin/nologin oncotrace

# Read-only access to the code, venv and reference data. Ubuntu home dirs are
# 0750, so the account needs traverse permission on the way down; the default
# ACL (-d) covers files a later `git pull` creates. (`sudo apt install acl` if
# setfacl is missing.)
sudo setfacl -m u:oncotrace:x /home/anand /home/anand/OncoTrace-AI
sudo setfacl -R -m u:oncotrace:rX /home/anand/OncoTrace-AI/server
sudo setfacl -R -d -m u:oncotrace:rX /home/anand/OncoTrace-AI/server

# Production secrets live ONLY in /etc/oncotrace/env (next step). If a
# server/.env exists on this host, move anything you still need from it into
# that file and delete it: it would otherwise fill in any key the env file
# doesn't set -- or, if it is 0600 and so unreadable by `oncotrace`, stop the
# service from starting at all.
ls -l .env 2>/dev/null && echo "move its values to /etc/oncotrace/env, then: rm .env"

# Secrets (see server/.env.example for the keys; the password must be at least
# 12 characters and not the placeholder, or every sign-in gets a 503)
sudo mkdir -p /etc/oncotrace
sudo install -m 600 -o root -g root /dev/null /etc/oncotrace/env
sudo nano /etc/oncotrace/env

# Edit the paths in the unit file first, then:
sudo cp deploy/oncotrace-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now oncotrace-backend
curl -s localhost:8000/api/v1/health
systemd-analyze security oncotrace-backend    # expect "OK" (about 3), not "EXPOSED"
```

The unit runs the backend sandboxed: read-only filesystem apart from a private
`/tmp`, no capabilities, no device access, IPv4/IPv6/Unix sockets only. If the
app ever needs to write somewhere else, add that one directory with
`ReadWritePaths=` rather than loosening `ProtectSystem`. Do not add
`MemoryDenyWriteExecute=yes`: SnpEff's JVM needs it off.

### 2. nginx

**First back up the current config.** If this domain already serves other apps
(for example `/mammodemo/`, which the site's "View Demo → Mammogram" button
opens), copy their `location` blocks into the marked **KEEP** section of
`oncotrace-site.conf` before switching over.

```bash
sudo nginx -T > ~/nginx-backup-$(date +%F).txt
grep -n "location" /etc/nginx/sites-enabled/*      # anything to carry over?

cd /home/anand/OncoTrace-AI/server/deploy/nginx
sudo cp oncotrace-http.conf             /etc/nginx/conf.d/
sudo cp oncotrace-security-headers.conf /etc/nginx/snippets/
sudo cp oncotrace-csp.conf              /etc/nginx/snippets/
sudo cp oncotrace-site.conf             /etc/nginx/sites-available/oncotrace
sudo ln -sf /etc/nginx/sites-available/oncotrace /etc/nginx/sites-enabled/oncotrace
# Disable whichever old site file served this domain, e.g.:
#   sudo rm /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/oncotraceai
sudo nginx -t && sudo systemctl reload nginx
```

### 3. HTTPS (required: the demo password travels in a header)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d www.oncotrace-ai.org -d oncotrace-ai.org
```

Then turn on HTTP/2: in `/etc/nginx/sites-available/oncotrace`, change certbot's
`listen 443 ssl;` to `listen 443 ssl http2;` (and the `[::]:443` line too), then
`sudo nginx -t && sudo systemctl reload nginx`.

### 4. fail2ban (ban addresses that keep failing sign-in)

The backend logs every refused credential, on `/auth/verify` and on uploads,
as `demo auth failure from <client IP>`. nginx's rate limits slow a guesser to
a few tries a minute (5/min on sign-in, 2/min on uploads); fail2ban bans an
address outright after 10 failures in 10 minutes, for an hour.

```bash
sudo apt install fail2ban
cd /home/anand/OncoTrace-AI/server/deploy/fail2ban
sudo cp oncotrace-auth.conf /etc/fail2ban/filter.d/
sudo cp oncotrace.local     /etc/fail2ban/jail.d/
sudo fail2ban-regex systemd-journal oncotrace-auth   # should count your test failures
sudo systemctl restart fail2ban
sudo fail2ban-client status oncotrace-auth
# Unban yourself: sudo fail2ban-client set oncotrace-auth unbanip <ip>
```

### 5. Optional: Brotli (~15–20% smaller JS/CSS than gzip)

The build already writes `.br` files; nginx only needs the module:

```bash
sudo apt install libnginx-mod-http-brotli-static
# uncomment `brotli_static on;` in /etc/nginx/sites-available/oncotrace
sudo nginx -t && sudo systemctl reload nginx
```

---

## Verify

```bash
D=https://www.oncotrace-ai.org
curl -sI $D/ | grep -iE "^(http|cache-control|strict-transport|content-security)"
#   200, Cache-Control: no-cache, HSTS and CSP present
curl -sI -H 'Accept-Encoding: gzip' $D/DNA_STRAND_NEW.glb | grep -iE "content-(encoding|type)"
#   Content-Encoding: gzip, Content-Type: model/gltf-binary
curl -sI $D/blog/why-we-focus-on-ctdna | head -1        # 200 (SPA fallback)
curl -s  $D/api/v1/health                               # {"status":"ok",...}
curl -sI http://oncotrace-ai.org | grep -i location     # 301 -> https://www.oncotrace-ai.org/
# An upload without credentials is refused at once, before its body is read,
# and never with a WWW-Authenticate header (it would pop the browser's own
# login dialog over the app's):
head -c 50000000 /dev/zero > /tmp/big.vcf
curl -s -o /dev/null -w '%{http_code} %{time_total}s sent=%{size_upload}\n' \
     -F vcf_file=@/tmp/big.vcf $D/api/v1/vcf/analyze  # 401, well under a second, sent far below 50 MB
curl -sI -X POST $D/api/v1/auth/verify | grep -ci www-authenticate   # 0
curl -s  $D/openapi.json -o /dev/null -w '%{http_code}\n'            # 404: API docs are off in production
```

## Troubleshooting

| Symptom | Check |
|---|---|
| `502 Bad Gateway` on `/api/` | `systemctl status oncotrace-backend`, `journalctl -u oncotrace-backend -n 50` |
| Demo sign-in returns 503 | `/etc/oncotrace/env` missing or unreadable, or the password is the `.env.example` placeholder or shorter than 12 characters. `journalctl -u oncotrace-backend` names the reason (never the value); restart the service after editing the file |
| Service fails to start with `PermissionError` | A `server/.env` exists that `oncotrace` cannot read: delete it (production secrets belong in `/etc/oncotrace/env`), or fix the ACLs from step 1 |
| `429` on sign-in or upload | Rate limit working as intended (5/min per IP on sign-in, 2/min on uploads) |
| A user is suddenly unable to connect at all | fail2ban banned their address: `sudo fail2ban-client status oncotrace-auth` |
| Upload fails with `413` although the file is under 500 MB | A compressed file expanding past 2 GiB, or more than 20,000 variant records: `ONCOTRACE_MAX_DECOMPRESSED_BYTES` / `ONCOTRACE_MAX_RECORDS` in `/etc/oncotrace/env` |
| A new third-party script or API is blocked | Console shows "Refused to ...": add its origin to `oncotrace-csp.conf` |
| Homepage shows briefly, then another page (or vice versa) | nginx not reloaded after a deploy that introduced `app.html`: run `sudo nginx -t && sudo systemctl reload nginx` |
| New deploy not visible | Check the rsync step ran and nginx was reloaded; `index.html` is `no-cache`, so a normal refresh picks it up |
