# 📧 Sh_R_Mail — Email Engine

> A self-hosted, multi-tenant email marketing and campaign management platform.  
> Built on FastAPI · Next.js · RabbitMQ · AWS SES · Supabase.

**Status:** Active Development — core pipeline complete, MVP hardening in progress.

---

## Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Repository Structure](#repository-structure)
5. [Prerequisites](#prerequisites)
6. [Setup — macOS](#setup--macos)
7. [Setup — Linux (Ubuntu / Debian)](#setup--linux-ubuntu--debian)
8. [Setup — Windows (WSL2)](#setup--windows-wsl2)
9. [Environment Variables](#environment-variables)
10. [Running Locally (Without Docker)](#running-locally-without-docker)
11. [Running with Docker Compose](#running-with-docker-compose)
12. [Running Database Migrations](#running-database-migrations)
13. [Viewing Logs](#viewing-logs)
14. [Project Docs & Progress Tracker](#project-docs--progress-tracker)
15. [Live Project Tracker](#live-project-tracker)
16. [Contributing](#contributing)

---

## What This Project Does

Sh_R_Mail is a **full email marketing platform** — think a self-hosted Mailchimp/SendGrid.

| Feature | Status |
|---|---|
| Multi-tenant auth (custom JWT + bcrypt) | ✅ Done |
| Contact management (CSV import, tags, segments, suppression) | ✅ Done |
| Email template builder (block editor + MJML + 35+ presets) | ✅ Done |
| Campaign creation, scheduling, pause, cancel | ✅ Done |
| Background email delivery via AWS SES (SMTP + RabbitMQ) | ✅ Done |
| Open tracking (Supabase Edge Function pixel) | ✅ Done |
| Bounce / unsubscribe / spam complaint handling (SES webhooks) | ✅ Done |
| Analytics dashboard (opens, bounces, unsubscribes, proxy breakdown) | ✅ Done |
| Sender identity verification (custom token flow) | ✅ Done |
| Workspace isolation models (team / agency) | ✅ Done |
| Plan enforcement & quotas | 🔧 In Progress |
| Stripe payments | 📋 Planned |
| Automated tests | 📋 Planned |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                     Browser                           │
│         http://localhost:3000 (Next.js 14)            │
└───────────────────────┬──────────────────────────────┘
                        │ API calls
                        ▼
┌──────────────────────────────────────────────────────┐
│              FastAPI Backend  :8000                   │
│  /auth  /contacts  /campaigns  /templates             │
│  /analytics  /webhooks  /unsubscribe  /senders        │
└────────┬──────────────────────────────┬───────────────┘
         │ Supabase (PostgreSQL)         │ RabbitMQ
         ▼                              ▼
┌─────────────────┐        ┌────────────────────────┐
│  Supabase DB    │        │   Email Worker         │
│  (PostgreSQL)   │◄──────►│   (email_sender.py)    │
│  25 migrations  │        │   Sends via SES SMTP   │
└─────────────────┘        └────────────┬───────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │   AWS SES        │
                              │   (SMTP :587)    │
                              └──────────────────┘
```

**How a campaign send works:**
1. Tenant creates a Campaign, chooses audience + template
2. Clicks **Send** → API snapshots HTML + recipients → publishes tasks to RabbitMQ
3. Email Worker (Python) consumes from RabbitMQ → sends each email via SES SMTP
4. On failure: exponential backoff retry → dead-letter queue
5. SES webhooks (SNS) post bounce/complaint events back → contacts auto-suppressed
6. Open-tracking pixel (Supabase Edge Function) logs open events per recipient

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS | 14 |
| Backend API | Python FastAPI + Uvicorn | 0.115+ |
| Email Worker | Python async (aio-pika, aiosmtplib) | — |
| Database | Supabase (PostgreSQL) | — |
| Auth | Custom JWT (bcrypt + python-jose) | — |
| Message Queue | RabbitMQ (via CloudAMQP) | — |
| Cache / State | Redis | 7+ |
| Email Sending | Amazon SES (SMTP) | — |
| Containerization | Docker + Docker Compose | — |
| Reverse Proxy | Nginx | — |

---

## Repository Structure

```
Sh_R_Mail/
├── platform/
│   ├── api/              # FastAPI backend
│   │   ├── routes/       # All route modules (auth, contacts, campaigns, …)
│   │   ├── services/     # Business logic (dispatch, notification, email)
│   │   ├── utils/        # Supabase client, Redis client, rate limiter, …
│   │   ├── models/       # Pydantic models / DB helpers
│   │   ├── main.py       # FastAPI app entry point
│   │   └── requirements.txt
│   ├── client/           # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/      # App Router pages (auth, campaigns, contacts, …)
│   │       ├── components/ui/  # Shared component library
│   │       └── context/  # AuthContext, TenantContext
│   └── worker/
│       ├── email_sender.py   # Main RabbitMQ consumer + SES sender
│       ├── background_worker.py
│       └── scheduler.py      # Campaign scheduler
├── migrations/           # 25 SQL migration files (applied to Supabase)
├── supabase/             # Supabase Edge Function (open-tracking pixel)
├── docs/
│   ├── phases/
│   │   └── phase_wise_plan.md   # Full architectural plan
│   ├── progress.html            # Interactive task tracker (open in browser)
│   ├── rebuild_tracker.py       # Regenerates progress.html from source data
│   ├── audits/                  # Phase technical audit logs
│   └── dev-notes/               # Developer scratch notes (not for review)
├── scripts/              # VPS install, migration runners, seed scripts
├── deploy/               # Dockerfiles for api / worker / client
├── tests/                # Test suite (fixtures; full tests planned Phase 7.6)
├── docker-compose.yml
├── .env.example          # Template — copy to .env and fill in credentials
└── README.md
```

---

## Prerequisites

Install these before anything else. Verify with the commands shown.

| Tool | Why | Check |
|---|---|---|
| **Git** | Clone the repo | `git --version` |
| **Python 3.11+** | FastAPI backend + worker | `python3 --version` |
| **Node.js 18+** | Next.js frontend | `node --version` |
| **npm 9+** | Frontend package manager | `npm --version` |
| **RabbitMQ account** | Message queue — use [CloudAMQP free tier](https://www.cloudamqp.com) | — |
| **Supabase project** | Database — [supabase.com](https://supabase.com) free tier | — |
| **AWS SES account** | Email sending (sandbox or production) | — |
| **Redis** | Campaign state + rate limiting — [Redis Cloud free tier](https://redis.com/try-free/) or local | — |
| **Docker** *(optional)* | Run everything in containers | `docker --version` |

---

## Setup — macOS

Open **Terminal** and run these commands in order.

### Step 1 — Install system tools

If you don't have Homebrew yet:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Install Python, Node, and Git:
```bash
brew install python@3.11 node git
```

Verify:
```bash
python3 --version   # should say 3.11.x or higher
node --version      # should say v18.x or higher
git --version
```

### Step 2 — Clone the repository

```bash
git clone <repo-url>
cd Sh_R_Mail
```

### Step 3 — Set up environment variables

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in all the credentials. See the [Environment Variables](#environment-variables) section for what each one means.

### Step 4 — Set up the Python backend

```bash
cd platform/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### Step 5 — Set up the frontend

```bash
cd platform/client
npm install
cd ../..
```

---

## Setup — Linux (Ubuntu / Debian)

Open a **terminal** and run these commands in order.

### Step 1 — Install system tools

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential

# Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:
```bash
python3.11 --version
node --version
git --version
```

### Step 2 — Clone the repository

```bash
git clone <repo-url>
cd Sh_R_Mail
```

### Step 3 — Set up environment variables

```bash
cp .env.example .env
nano .env       # or use any editor — vim, code, etc.
```

Fill in all credentials. See [Environment Variables](#environment-variables).

### Step 4 — Set up the Python backend

```bash
cd platform/api
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### Step 5 — Set up the frontend

```bash
cd platform/client
npm install
cd ../..
```

---

## Setup — Windows (WSL2)

> **Important:** This project uses Unix shell scripts and Python async I/O. The supported path on Windows is **WSL2** (Windows Subsystem for Linux). Running natively on Windows PowerShell/CMD is not supported.

### Step 1 — Enable WSL2

Open PowerShell as Administrator:
```powershell
wsl --install
```

Restart your computer. Then open the **Ubuntu** app from the Start menu.

### Step 2 — Install tools inside WSL2

In the Ubuntu terminal:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential python3.11 python3.11-venv python3-pip

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 3 — Clone the repository

Inside WSL2:
```bash
git clone <repo-url>
cd Sh_R_Mail
```

> **Tip:** Keep your project files inside the WSL2 filesystem (`/home/<user>/`) — not in `/mnt/c/` (Windows drive). File I/O from `/mnt/c/` is significantly slower.

### Step 4 — Set up environment variables

```bash
cp .env.example .env
nano .env
```

### Step 5 — Set up the Python backend

```bash
cd platform/api
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### Step 6 — Set up the frontend

```bash
cd platform/client
npm install
cd ../..
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value.

```env
# ── Supabase (Database) ──────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ── RabbitMQ (Message Queue) ─────────────────────────────
# Get a free URL from https://www.cloudamqp.com
RABBITMQ_URL=amqps://user:pass@host.cloudamqp.com/vhost

# ── Redis (Campaign State + Rate Limiting) ───────────────
# Local Redis: redis://localhost:6379/0
# Redis Cloud: rediss://:password@host:port
REDIS_URL=redis://localhost:6379/0

# ── AWS SES (Email Sending — SMTP) ───────────────────────
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com

# ── JWT Auth ─────────────────────────────────────────────
JWT_SECRET_KEY=generate-a-long-random-string-here

# ── Unsubscribe & Tracking Secrets ───────────────────────
# Must be long random strings — used to sign HMAC tokens
UNSUBSCRIBE_SECRET=generate-random-string
TRACKING_SECRET=generate-random-string

# ── Frontend ─────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000

# ── App Environment ───────────────────────────────────────
ENV=development
```

> **How to generate secret keys:**
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```
> Run this 3 times and use each output for `JWT_SECRET_KEY`, `UNSUBSCRIBE_SECRET`, and `TRACKING_SECRET`.

---

## Running Locally (Without Docker)

You need **4 terminal windows** open simultaneously.

### Terminal 1 — FastAPI Backend

```bash
cd platform/api
source .venv/bin/activate          # Windows WSL2: same command
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

✅ **API is ready** → open http://localhost:8000/docs to see all endpoints.

---

### Terminal 2 — Email Worker

```bash
cd platform/api
source .venv/bin/activate
cd ../worker
python email_sender.py
```

You should see:
```
[INFO] Worker: Connected to RabbitMQ
[INFO] Worker: Waiting for messages...
```

✅ **Worker is ready** — it will process campaign dispatch tasks.

---

### Terminal 3 — Background Data Worker

```bash
cd platform/api
source .venv/bin/activate
cd ../worker
python background_worker.py
```

You should see:
```
[INFO] BackgroundWorker: Connected to RabbitMQ
[INFO] BackgroundWorker: Waiting for long-running jobs...
```

✅ **Data Worker is ready** — it will process CSV imports, exports, and heavy lifting.

---

### Terminal 4 — Frontend (Next.js)

```bash
cd platform/client
npm run dev
```

You should see:
```
▲ Next.js 14
- Local: http://localhost:3000
✓ Ready in 2.3s
```

✅ **Frontend is ready** → open http://localhost:3000

---

### Terminal 5 — (Optional) Campaign Scheduler

The scheduler handles time-based campaign sends. It is embedded in the API process by default. If you want to run it separately:

```bash
cd platform/api
source .venv/bin/activate
cd ../worker
python scheduler.py
```

---

### Service Summary

| Service | URL | Description |
|---|---|---|
| Frontend | http://localhost:3000 | Main application |
| Backend API | http://localhost:8000 | REST API |
| Email Worker | *(Background)* | Sends emails via SES |
| Data Worker  | *(Background)* | Processes CSV imports |
| API Docs | http://localhost:8000/docs | Interactive Swagger UI |
| API Health | http://localhost:8000/health | Health check (DB + version) |

---

## Running with Docker Compose

Docker runs all services (API + Worker + Frontend + Nginx) together.

### Start everything

```bash
docker-compose up --build
```

Run in background (detached):
```bash
docker-compose up --build -d
```

### Stop everything

```bash
docker-compose down
```

### View logs

```bash
docker-compose logs -f api       # FastAPI logs
docker-compose logs -f worker    # Email worker logs
docker-compose logs -f client    # Frontend logs
docker-compose logs -f           # All services
```

### Rebuild a single service

```bash
docker-compose up --build api
```

---

## Running Database Migrations

Migrations are SQL files in `migrations/` numbered sequentially. They are applied to your **Supabase** project.

### Option A — Supabase Dashboard (Recommended for first setup)

1. Go to: https://supabase.com/dashboard → your project → **SQL Editor**
2. Open each file in `migrations/` in order (001, 002, 003 … 025)
3. Paste the SQL and click **Run**

### Option B — Script

```bash
cd scripts
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first
python3 run_migration_direct.py
```

### Option C — Supabase CLI

```bash
# Install Supabase CLI
brew install supabase/tap/supabase    # macOS
# or: npm install -g supabase         # any platform

supabase login
supabase db push
```

> **Note:** Migrations must be applied in order. If you are setting up a fresh environment, apply all 25 files starting from `002_progressive_onboarding.sql`.

---

## Viewing Logs

### Without Docker (plain processes)

Each service prints to its own terminal window. To save to log files:

```bash
# Terminal 1 — API
uvicorn main:app --reload --port 8000 > logs/api.log 2>&1

# Terminal 2 — Email Worker
python email_sender.py > logs/email_worker.log 2>&1

# Terminal 3 — Data Worker
python background_worker.py > logs/bg_worker.log 2>&1

# Watch all logs
tail -f logs/*.log
```

### With Docker

```bash
docker-compose logs -f              # All services
docker-compose logs -f api          # API only
docker-compose logs -f worker       # Worker only
```

---

## Project Docs & Progress Tracker

| Document | Description |
|---|---|
| [`docs/phases/phase_wise_plan.md`](docs/phases/phase_wise_plan.md) | Full architectural plan — all phases, design decisions, reviewer suggestions, and audit fixes |
| [`docs/progress.html`](docs/progress.html) | **Interactive progress tracker** — double-click to open in your browser. Checkboxes save locally. |
| [`docs/rebuild_tracker.py`](docs/rebuild_tracker.py) | Regenerates `progress.html` from source data |
| `docs/audits/` | Technical audit logs per phase |

### View the interactive tracker

```bash
# macOS
open docs/progress.html

# Linux
xdg-open docs/progress.html

# Windows WSL2
explorer.exe "$(wslpath -w docs/progress.html)"
```

Or just **double-click** `docs/progress.html` in your file browser.

---

## Live Project Tracker

- **GitHub Pages URL:** https://rahul-pamula.github.io/Sh_R_Mail/progress.html
- Served from `main` → `docs/` on GitHub Pages. Updates after each push to `main`.
- If you see raw HTML instead of the page, re-check the Pages settings (branch=`main`, folder=`/docs`).

---

## Contributing

1. **Clone and branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** — follow the existing code style

3. **Test your changes** — the priority test targets are in Phase 7.6 of the plan

4. **Commit with a clear message:**
   ```bash
   git commit -m "feat: add soft bounce classification to webhooks"
   ```

5. **Open a Pull Request** — the tech lead will review before merging

### Code Style

- **Python:** Follow PEP8. Use `ruff` for linting (`pip install ruff && ruff check .`)
- **TypeScript:** ESLint config is already in `platform/client/.eslintrc.json`
- **Commits:** Use conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`

---

*Sh_R_Mail — built with FastAPI · Next.js · RabbitMQ · Supabase · AWS SES*
