# Best Life Apps — Project Management

An open-source, self-hosted project management platform — a modern alternative to Jira/Linear.
Built with **Django REST Framework** (backend) and **React + TypeScript** (frontend), fully
containerized with **Docker Compose** for a one-command local setup.

## Features

- **Work Items** — tasks/bugs/stories/epics with a rich text editor (TipTap), file attachments,
  comments, labels, priorities, and story points.
- **Cycles (Sprints)** — time-boxed iterations with an ideal-vs-actual **burndown chart**.
- **Customizable views** — a drag-and-drop **Kanban board** and a filterable **list view**, with
  search, priority, and label filters (savable view definitions are supported via the API).
- **Pages** — a built-in documentation/wiki space with the same rich text editor, per project.
- **Analytics dashboard** — a real-time (auto-refreshing) overview of status breakdown, priority
  mix, work item types, a 30-day completion trend, and cycle velocity.
- **Light/dark theme toggle**, Best Life Apps branding, JWT authentication, multi-project
  workspaces, and a Django admin for power-user data access.

## Tech stack

| Layer     | Tech |
|-----------|------|
| Backend   | Django 5, Django REST Framework, SimpleJWT, PostgreSQL |
| Frontend  | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, TipTap, dnd-kit, Recharts |
| Infra     | Docker Compose (Postgres + Django + Vite dev server) |

## Quick start (Docker)

Requirements: Docker and Docker Compose.

```bash
git clone https://github.com/osamnsa/bestlifeapps-pm.git
cd bestlifeapps-pm

# The backend ships with a ready-to-use local dev .env — for anything beyond
# local development, copy backend/.env.example and set real secrets instead.

docker compose up --build
```

This starts three services:

- `db` — PostgreSQL 16
- `backend` — Django API on **http://localhost:8000** (auto-runs migrations, static
  collection, and seeds demo data on first boot)
- `frontend` — Vite dev server on **http://localhost:5173** (hot reload enabled)

Open **http://localhost:5173** and log in with the seeded demo account:

```
username: admin
password: admin
```

(Additional demo users: `alex` / `jordan` / `sam`, password `password123`.)

The Django admin is available at **http://localhost:8000/admin/** with the same `admin` account.

To stop: `docker compose down` (add `-v` to also wipe the Postgres volume).

## Project layout

```
backend/     Django project (config, core, workitems, cycles, pages, analytics apps)
frontend/    React + Vite app (src/api, src/components, src/pages, src/store)
docker-compose.yml
```

## Backend API overview

All endpoints are namespaced under `/api/` and require a JWT bearer token (obtained from
`/api/auth/token/`) except the token endpoints themselves.

| Endpoint | Description |
|---|---|
| `POST /api/auth/token/` | Obtain access/refresh JWT tokens |
| `GET /api/me/` | Current authenticated user |
| `GET/POST /api/projects/` | Projects within your workspaces |
| `GET/POST /api/work-items/` | Work items (filter by `project`, `state`, `priority`, `cycle`, `assignees`, `labels`, `search`, ...) |
| `POST /api/work-items/{id}/upload_attachment/` | Upload a file attachment (multipart) |
| `GET/POST /api/cycles/` | Cycles (sprints) |
| `GET /api/cycles/{id}/burndown/` | Ideal vs. actual burndown data points |
| `GET/POST /api/pages/` | Documentation pages |
| `GET/POST /api/views/` | Saved/customizable board & list view configs |
| `GET /api/analytics/projects/{id}/` | Real-time project analytics snapshot |

## Local development without Docker

**Backend**

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then point POSTGRES_HOST at a local Postgres instance
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/media` to `http://localhost:8000` by default (see
`vite.config.ts`); override with `VITE_API_PROXY_TARGET` if your backend runs elsewhere.

## Production notes

- The frontend `Dockerfile` includes a `production` stage that builds static assets and serves
  them via nginx (which also proxies `/api` and `/media` to the backend container). Build it with
  `docker build --target production ./frontend`.
- Swap `gunicorn` (already the backend's default `CMD`) in front of Django for production, put
  a real `DJANGO_SECRET_KEY` and restrict `DJANGO_ALLOWED_HOSTS`/`CORS_ALLOWED_ORIGINS`.
- File attachments are stored on a local Docker volume by default; swap in S3-compatible storage
  (e.g. `django-storages`) for multi-instance deployments.

## License

MIT — this is an open-source starting point, fork it and make it yours.
