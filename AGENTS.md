# Repository Guidelines

## Project Structure & Module Organization
- `backend/` hosts the Django project: `albins2/` for settings, domain apps in `api/`, `auth/`, and `songs/`, each with its own `migrations/`. Shared scripts live under `backend/scripts/` (for example `import_songs.py`).
- `frontend/` contains the React + TypeScript Vite client. Source files sit in `frontend/src/`, static assets in `frontend/public/`, and Dockerfiles per environment at the root.
- `yxorp/` stores nginx reverse-proxy configs, while `docker-compose.*.yml` files orchestrate the full stack with Postgres.

## Build, Test, and Development Commands
- Spin up the stack with hot reloading: `docker compose -f docker-compose.dev.yml up --build` (after sourcing `env.dev.sh` or `env.prod.sh`, use `alb up --build`, `alb down`, etc.).
- Run backend tasks inside the container: `docker compose -f docker-compose.dev.yml run --rm backend python manage.py migrate` or `... test`. After sourcing `env.dev.sh` or `env.prod.sh`, call `alb-manage migrate`, `alb-manage test`, `alb-manage createsuperuser`, and `albins_import_songs` for seeding. Use `alb-pnpm <command>` (e.g. `alb-pnpm lint`) for frontend tooling from the repo root.
- Work on the frontend without Docker: `cd frontend && npm install && npm run dev` (Vite serves on port 5173 by default).
- Direct backend development: `cd backend && python manage.py runserver 0.0.0.0:8000` after sourcing `env.dev.sh` (or exporting the vars from `.env.dev`).

## Coding Style & Naming Conventions
- Python code should follow PEP 8 with 4-space indentation; name Django apps, models, and serializers in `snake_case` modules and `PascalCase` classes. Keep business logic inside the relevant app (e.g., `songs/services.py` if added) rather than the project settings module.
- TypeScript uses 2-space indentation, React components in `PascalCase`, hooks in `useCamelCase`. Re-export shared UI primitives from `frontend/src/components/` to avoid deep relative imports.
- Run `pnpm lint` (or `alb-pnpm lint`) to enforce the configured ESLint rules before pushing changes.

## Testing Guidelines
- Prefer app-level test modules (`backend/api/tests.py`, et al.). Organize larger suites as packages (`tests/`) with descriptive filenames like `test_song_permissions.py`.
- Use Django's `TestCase` for database-backed tests and Channels' async test utilities when covering websocket flows. Include fixtures or factory methods near the tests that need them.
- Execute `docker compose -f docker-compose.dev.yml run --rm backend python manage.py test` and ensure the suite passes before opening a pull request.

## Commit & Pull Request Guidelines
- Follow the existing history by writing concise, present-tense summaries that group backend and frontend work when relevant (e.g., `backend auth cleanup & frontend login polish`). Reference tickets in the body, not the subject.
- Each PR should include: a short problem statement, a bullet summary of changes, testing notes (commands run), and screenshots or GIFs for UI updates. Link related issues and call out migration or data-seeding steps explicitly.

## Environment & Configuration
- Root-level `.env.dev`/`.env.prod` hold sample configuration (including `SERVICE_ACCOUNT_USERNAME`/`SERVICE_ACCOUNT_EMAIL` for anonymous login and default `DJANGO_ALLOWED_HOSTS`). Source `env.dev.sh` or `env.prod.sh` to export variables and load shell aliases (`alb`, `alb-manage`, `alb-pnpm`, `albins_import_songs`). Each script wires those aliases to its own compose file; add additional hosts (e.g., LAN IPs) to `DJANGO_ALLOWED_HOSTS` as needed.
- Database changes require migrations (`python manage.py makemigrations`) checked into the respective app. Document any new ENV vars in both `.env` templates and the PR description.
- Agents must not handcraft migration files. Ask the user to run `alb-manage makemigrations` when schema changes are needed.
