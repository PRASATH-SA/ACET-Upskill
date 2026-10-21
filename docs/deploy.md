# Deploying ACET SkillUp

This guide takes a fresh Linux server to a running HTTPS deployment. It uses
`docker-compose.prod.yml`: nginx (static web app + HTTPS + `/api` proxy), the API (one process per
CPU core), the worker, MongoDB with authentication, Ollama, and a daily backup job.

Only nginx is reachable from outside, on ports 80 and 443.

## 1. Server

| | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04/24.04 LTS (any Linux with Docker) | |
| CPU / RAM | 4 cores / 16 GB | 8+ cores / 32 GB |
| Disk | 100 GB SSD | 250 GB SSD (videos, models, 30 days of backups) |
| GPU | none (AI drafting is slow on CPU) | NVIDIA with 8+ GB VRAM for `qwen2.5:7b-instruct` |

The H1 load test (500 students submitting quizzes and rating revision cards) passed with
p95 < 500 ms on one 16-core machine that was also running MongoDB and the load generator.

1. Point a DNS A record (e.g. `skillup.acet.ac.in`) at the server's public IP.
2. Allow inbound TCP 80 and 443 only (`sudo ufw allow 80,443/tcp && sudo ufw enable`; keep SSH open).
3. Install Docker Engine and the Compose plugin: https://docs.docker.com/engine/install/ubuntu/
4. GPU only: install the NVIDIA driver and the NVIDIA Container Toolkit
   (https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html),
   check with `docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi`, then
   uncomment the `deploy:` block of the `ollama` service in `docker-compose.prod.yml`.

## 2. Code and settings

```bash
git clone <your repo url> acet-skillup && cd acet-skillup
cp deploy/.env.prod.example .env.prod
nano .env.prod
```

Fill in every empty value. Generate each secret and password with `openssl rand -hex 32`
(hex only: the passwords go inside MongoDB connection strings). `SERVER_NAME` is your host name.
Keep `.env.prod` private; it is gitignored.

## 3. HTTPS certificate

The certificate and key must be in `deploy/certs/` as `fullchain.pem` and `privkey.pem`
(or set `CERTS_DIR`, `TLS_CERT` and `TLS_KEY` in `.env.prod`).

**College certificate:** copy the files there and skip to step 4.

**Let's Encrypt (free):** get the first certificate before starting nginx:

```bash
sudo docker run --rm -p 80:80 -v "$PWD/deploy/certs-le:/etc/letsencrypt" certbot/certbot \
  certonly --standalone -d skillup.acet.ac.in --agree-tos -m it@acet.ac.in --no-eff-email
sudo mkdir -p deploy/certs
sudo cp -L deploy/certs-le/live/skillup.acet.ac.in/{fullchain,privkey}.pem deploy/certs/
```

Renewal: start the stack with `--profile letsencrypt` (step 4); the `certbot` service renews
every 12 hours through nginx's `/.well-known/acme-challenge/`. Reload nginx after a renewal:
`docker compose --env-file .env.prod -f docker-compose.prod.yml exec web nginx -s reload`
(a weekly cron line is enough).

## 4. Start

```bash
alias dc='docker compose --env-file .env.prod -f docker-compose.prod.yml'
dc up -d --build                 # add --profile letsencrypt for automatic renewal
dc ps                            # mongo, api, worker, web, backup, ollama: running/healthy
dc --profile setup run --rm ollama-pull     # first time: download the LLM models (~5 GB)
```

The first start creates the MongoDB key file, the root user, an app user (read/write on
`acet_skillup` only) and a backup user (backup/restore roles only).

Check it: open `https://<SERVER_NAME>`, and `curl -s https://<SERVER_NAME>/api/v1/health` should
return `"status":"ok"`. `https://<SERVER_NAME>/api/v1/ai/health` reports the LLM.

## 5. First data

Either load the demo (never on a server real students use):

```bash
dc exec api node src/db/seed.js
```

or create the real HOD account, then sign in and set everything else up in the app
(Admin → Departments, Syllabus, Users → Import students (CSV)):

```bash
dc exec api node -e "
import('./src/config/env.js').then(async ({ loadEnv }) => {
  const cfg = loadEnv();
  const { connectMongo, disconnectMongo } = await import('./src/db/connect.js');
  const { hashPassword } = await import('./src/modules/auth/service.js');
  const { User } = await import('./src/modules/users/model.js');
  await connectMongo(cfg.MONGO_URI);
  await User.create({ name: 'HOD CSE', email: 'hod.cse@acet.ac.in', role: 'admin',
    passwordHash: await hashPassword(process.argv[1]) });
  await disconnectMongo();
});" 'a-long-first-password'
```

The HOD should change the password after the first sign-in.

## 6. Backups and restore

The `backup` service runs `deploy/backup/backup.sh` every day at `BACKUP_TIME` (default 02:30,
`TZ` Asia/Kolkata). Each run writes to `BACKUP_DIR` (default `./backups`):

- `skillup-<UTC time>.archive.gz`: a `mongodump` of the database, read back with
  `mongorestore --dryRun` before it is kept, so a broken dump is noticed the same day;
- `uploads-<UTC time>.tar.gz`: uploaded notes, videos and voice answers.

Files older than `BACKUP_RETENTION_DAYS` (30) are deleted. **Copy `./backups` to another machine
or cloud storage** (e.g. a nightly `rclone sync`); a backup on the same disk does not survive a
dead disk.

Take a backup now: `dc run --rm backup sh /scripts/backup.sh --once`

**Restore** (tested end to end in CI by `deploy/backup/test-backup-restore.sh`):

```bash
dc stop api worker                          # nothing may write during the restore
ls backups/                                 # pick the files to restore
dc run --rm backup sh /scripts/restore.sh \
  skillup-20261021-023000.archive.gz uploads-20261021-023000.tar.gz
dc start api worker
```

`restore.sh` replaces every collection in the backup (`--drop`) and unpacks the uploads over the
current ones. To rehearse without touching production, restore into a second stack on another
server.

## 7. Updates

```bash
git pull
dc run --rm backup sh /scripts/backup.sh --once     # backup first
dc up -d --build
```

## 8. Operations

| Task | Command |
|---|---|
| Logs | `dc logs -f api worker web` |
| Status | `dc ps`, `/api/v1/health`, Admin → AI settings |
| Restart the API | `dc restart api` |
| Change models | Admin → AI settings (no restart), or `LLM_CHAT_MODEL` in `.env.prod` |
| Scale | `API_WORKERS` (0 = one per core). Per-user rate limits are per API process. |

## Security notes

- Only nginx is published. MongoDB, Ollama, the API and the worker are on the internal network.
- MongoDB runs with authentication. The app user can only read and write `acet_skillup`.
- nginx sends HSTS, a strict Content-Security-Policy (scripts from this origin only),
  `X-Frame-Options: DENY` and `nosniff` (`deploy/nginx/security-headers.conf`).
- The API trusts one proxy hop (`trust proxy 1`), so rate limits see real client IPs. Limits are
  per signed-in user (`API_RATE_LIMIT_PER_MIN`, 300) with a high per-IP ceiling
  (`API_IP_RATE_LIMIT_PER_MIN`), because a college network puts every student behind one public IP.
- Student data never leaves the server: the LLM and speech models run locally (A.7.9).
- `npm run check:secrets` and `npm audit --omit=dev --audit-level=high` run in CI.

## Frontend on Vercel (optional)

The web app can be hosted on Vercel while the API runs on this stack. `apps/web/vercel.json`
serves the single-page app and rewrites `/api/*` to the API's public URL, so the browser still sees
one origin (refresh cookie and offline caching keep working). Set the API URL in that file's
rewrite. The backend itself does not run on Vercel: it needs the worker, persistent uploads and the
local LLM.
