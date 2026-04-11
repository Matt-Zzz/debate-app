# Deploying This App And Its Database To AWS EC2

This repo is a three-part deployment:

1. `backend-python/` runs the FastAPI API.
2. `frontend/` builds a static Vite app.
3. `backend-python/app.db` is the SQLite database file.

For this codebase, the database is not a separate managed service. The app reads and writes a local SQLite file on the EC2 instance.

## Recommended Architecture

- EC2 instance: Ubuntu LTS
- `nginx`: serves the frontend build and reverse-proxies `/api` to FastAPI
- `systemd`: keeps the FastAPI backend running
- SQLite file: stored on the EC2 instance at `backend-python/app.db`

## Before You Start

You will need:

- An EC2 instance with a public IP or domain
- An SSH key pair that can access the instance
- Security group rules:
  - `22` from your IP
  - `80` from the internet
  - `443` from the internet
- Your backend secrets:
  - `GEMINI_API_KEY`
  - `GOOGLE_CLIENT_ID` if you use Google sign-in

## Important Repo-Specific Notes

### 1. The frontend is not production-ready as-is

Several frontend files still hardcode `http://localhost:3001/api`. That works only for local development.

Current hardcoded API references:

- `frontend/src/lib/api.js`
- `frontend/src/components/coach/CoachMode.jsx`
- `frontend/src/SpeechPolish.jsx`
- `frontend/src/ClashGame.jsx`
- `frontend/src/FallacyHunt.jsx`

Before building for EC2, change those to use either:

- a relative path like `/api`
- or a Vite env var like `import.meta.env.VITE_API_BASE_URL`

The cleanest production choice is `/api`, then let `nginx` proxy `/api` to the backend.

### 2. The database is SQLite

The backend uses:

```python
DB_PATH = Path(__file__).parent / "app.db"
```

That means:

- a fresh deployment will create `backend-python/app.db` automatically on first boot
- an existing deployment can be migrated by copying your current `backend-python/app.db` file to the server
- you should back up that file regularly

### 3. The root `package.json` is stale

The root scripts still point at `backend/`, but this repo uses `backend-python/`. For deployment, use the real backend path directly.

## Step 1: Launch The EC2 Instance

Create an Ubuntu EC2 instance and attach a security group with:

- `22` from your IP only
- `80` from `0.0.0.0/0`
- `443` from `0.0.0.0/0`

If you already have a domain, point an `A` record at the EC2 public IP.

## Step 2: SSH Into The Server

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

## Step 3: Install System Packages

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx git
```

Install Node.js and verify you have Node `18+`:

```bash
sudo apt install -y nodejs npm
node -v
npm -v
```

If `node -v` is older than `18`, install a newer Node version before continuing.

## Step 4: Copy Or Clone The Repo

Option A: clone from GitHub

```bash
cd /home/ubuntu
git clone <YOUR_REPO_URL> debate-app
cd debate-app
```

Option B: copy your local repo to the server

```bash
scp -i /path/to/your-key.pem -r /local/path/to/debate-app ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/
```

## Step 5: Create A Python Virtual Environment

From the repo root:

```bash
cd /home/ubuntu/debate-app
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend-python/requirements.txt
```

## Step 6: Configure Backend Environment Variables

Create `/home/ubuntu/debate-app/backend-python/.env`:

```env
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-2.5-flash-lite
GOOGLE_CLIENT_ID=your_google_client_id_if_needed
```

Do not commit this file.

If any secrets were ever committed to git, rotate them before deploying.

## Step 7: Fix Frontend API URLs Before Building

Change the frontend so API calls go to `/api` in production.

At minimum, replace hardcoded `http://localhost:3001/api` values with `/api`.

Example pattern:

```js
const API = import.meta.env.VITE_API_BASE_URL || "/api";
```

If you choose the env-var route, create:

`/home/ubuntu/debate-app/frontend/.env.production`

```env
VITE_API_BASE_URL=/api
```

If you skip this step, the deployed frontend will still try to call the browser's own `localhost:3001`, which will fail for normal users.

## Step 8: Build The Frontend

```bash
cd /home/ubuntu/debate-app/frontend
npm install
npm run build
```

This creates the production build in:

```text
/home/ubuntu/debate-app/frontend/dist
```

## Step 9: Move Or Restore The SQLite Database

### New deployment with an empty DB

You can skip this. The backend will create `backend-python/app.db` automatically.

### Existing deployment or local data migration

Copy your local database file:

```bash
scp -i /path/to/your-key.pem /local/path/to/debate-app/backend-python/app.db \
  ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/debate-app/backend-python/app.db
```

Make sure the app user can read and write it:

```bash
chmod 600 /home/ubuntu/debate-app/backend-python/app.db
```

## Step 10: Create A systemd Service For The Backend

Create `/etc/systemd/system/debate-backend.service`:

```ini
[Unit]
Description=Debate App FastAPI Backend
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/debate-app/backend-python
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/ubuntu/debate-app/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 3001 --env-file .env
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable debate-backend
sudo systemctl start debate-backend
sudo systemctl status debate-backend
```

Useful logs:

```bash
journalctl -u debate-backend -f
```

## Step 11: Configure Nginx

Create `/etc/nginx/sites-available/debate-app`:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_PUBLIC_IP;

    root /home/ubuntu/debate-app/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/debate-app /etc/nginx/sites-enabled/debate-app
sudo nginx -t
sudo systemctl restart nginx
```

If the default site conflicts, remove it:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Step 12: Add HTTPS With Let's Encrypt

If you have a real domain:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Then verify auto-renew:

```bash
sudo systemctl status certbot.timer
```

## Step 13: Verify The Deployment

Check backend health manually:

```bash
curl http://127.0.0.1:3001/api/health
```

Check through nginx:

```bash
curl http://YOUR_DOMAIN_OR_PUBLIC_IP/api/health
```

Then open the site in a browser:

```text
http://YOUR_DOMAIN_OR_PUBLIC_IP
```

or, after HTTPS is set up:

```text
https://your-domain.com
```

## Updating The App Later

For a new deploy:

```bash
cd /home/ubuntu/debate-app
git pull
source .venv/bin/activate
python -m pip install -r backend-python/requirements.txt
cd frontend
npm install
npm run build
sudo systemctl restart debate-backend
sudo systemctl restart nginx
```

If your schema changes, back up `backend-python/app.db` before restarting the backend.

## Backing Up The SQLite Database

The critical file is:

```text
/home/ubuntu/debate-app/backend-python/app.db
```

Simple manual backup:

```bash
cp /home/ubuntu/debate-app/backend-python/app.db /home/ubuntu/debate-app/backend-python/app-$(date +%F-%H%M%S).db
```

If you want durable backups, copy those snapshots to S3 on a schedule.

## Common Problems

### Frontend loads but API calls fail

Usually means one of these:

- frontend still points to `http://localhost:3001/api`
- nginx is not proxying `/api`
- backend service is down

### `502 Bad Gateway` from nginx

Usually means FastAPI is not running or crashed.

Check:

```bash
sudo systemctl status debate-backend
journalctl -u debate-backend -f
```

### App starts but data is missing

You likely deployed with a fresh empty `app.db` instead of your existing file.

### CORS problems

This backend currently allows all origins, so CORS should not be the first suspect. A bad API base URL is more likely.

## Recommended Next Improvement

If you plan to keep deploying this app, the next practical step is:

1. Move all frontend API calls to one shared helper.
2. Make the API base configurable with `VITE_API_BASE_URL`.
3. Consider moving from SQLite on EC2 to Postgres or RDS once you need safer multi-user production storage.
