# Albins 2

Albins 2 is Datateknologerna's digital songbook. It preserves lyrics, metadata, and performance notes for the guild's traditional repertoire, making it easy to browse, search, and rehearse songs during sits. The stack pairs a Django REST backend with a React + TypeScript frontend, and the full workflow is orchestrated through Docker Compose.

## Core Features
- Browse and search the full song catalogue with lyrics and metadata.
- Manage song categories, authors, and translations through authenticated tooling.
- Seed canonical content via `albins_import_songs` to keep development and production environments aligned.
- Serve the same API to both the public web client and any future companion apps.

## Repository Layout
- `backend/` – Django project (`albins2/`) plus domain apps in `api/`, `auth/`, and `songs/`. App specific migrations live beside each app. Shared scripts (e.g. `import_songs.py`) live under `backend/scripts/`.
- `frontend/` – Vite-based React client. Source lives in `frontend/src/` and static assets in `frontend/public/`.
- `yxorp/` – nginx reverse proxy configuration.
- `docker-compose.*.yml` – stack definitions used through the helper scripts in `env.dev.sh` and `env.prod.sh`.

## Prerequisites
- Docker with Docker Compose v2 support

Everything else (Python, Node.js, database, nginx) is provisioned inside containers.

## Quick Start
1. Export environment variables and helper aliases:
   ```bash
   source env.dev.sh
   ```
2. Build and launch the full stack with hot reloading:
   ```bash
   alb up --build
   ```
3. Visit the site at `http://localhost:8080`. The backend is available at port 8000 within the stack, and the Vite dev server is proxied through nginx.
4. Stop and remove containers when you are done:
   ```bash
   alb down
   ```

## Common Container Commands
- Run Django migrations: `alb-manage migrate`
- Execute the test suite: `alb-manage test`
- Create a superuser: `alb-manage createsuperuser`
- Run frontend pnpm tasks from the repo root: `alb-pnpm <command>` (e.g., `alb-pnpm lint`)
- Import seed data: `albins_import_songs`

All helper aliases route to `docker compose` commands defined in `env.dev.sh` / `env.prod.sh`. Use them (or call the corresponding `docker compose -f docker-compose.dev.yml …` command) instead of running services directly on the host.

## Testing
- Backend: `alb-manage test`
- Frontend lint: `alb-pnpm lint`

Make sure the Django test suite passes before opening a pull request.

## Environment
- Sample configuration lives in `.env.example`, which `env.dev.sh` now sources directly for development.
- For production deployments, copy `.env.example` to `.env.prod`, fill in environment-specific values, and then source `env.prod.sh`.
- Update `DJANGO_ALLOWED_HOSTS` as needed (e.g., add your LAN IP) and document any new environment variables in the template.

## Contribution Tips
- Follow PEP 8 for Python and the repo’s ESLint/Prettier configuration for TypeScript.
- Keep business logic inside the app where it belongs (for example, `songs/services.py` when introduced).
- Group PR summaries by backend/frontend, include migration or data seeding notes, and link related issues.

For the original Albins repository see https://github.com/Datateknologerna-vid-Abo-Akademi/Albins.
