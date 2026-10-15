# Repository Guidelines

## Project Structure & Module Organization
- This repository is the whole Albins service: a Payload CMS 3 and Next.js 16 app deployed to Cloudflare Workers with a D1 database. There is no separate API or client project.
- `src/app/(frontend)/` holds the public start screen and its styles. `src/app/(payload)/` holds the Payload admin panel and its REST and GraphQL routes. `src/app/api/session/` and `src/app/api/songbook/` hold the two custom routes.
- `src/collections/` defines the Payload collections, `src/access/` the shared access functions, `src/lib/` the signing and HTML conversion helpers, and `src/migrations/` the checked-in D1 migrations.
- `scripts/` holds local and CI tooling; `scripts/import-songs.ts` seeds D1 from `.migration/songs-export.json` (gitignored, read-only production export). `public/` holds static assets such as the Albin logo.
- `wrangler.jsonc` is the Worker configuration, `open-next.config.ts` the OpenNext build config, and `.github/workflows/checks.yml` the only CI workflow.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies. Use `pnpm install --frozen-lockfile` to match CI.
- `pnpm dev` starts the Next.js dev server on http://localhost:3000, backed by wrangler's local platform proxy and the local D1 file under `.wrangler/state`.
- `pnpm migrate` applies the checked-in migrations to the local D1 database; `pnpm migrate:create --name add-something` generates a new one.
- `pnpm import:songs` seeds the local database from the corpus export. It is idempotent, and `SONGS_EXPORT_PATH` overrides the default input path.
- `pnpm typecheck` runs `tsc --noEmit`, `pnpm build` runs `next build --webpack`, and `pnpm build:worker` runs the OpenNext build that writes `.open-next/worker.js`. `pnpm preview` builds and serves the Worker bundle locally.
- `pnpm generate:types` regenerates `src/payload-types.ts` and `pnpm generate:importmap` regenerates the admin import map. Never edit either by hand.
- CI runs `pnpm install --frozen-lockfile`, `pnpm typecheck` and `pnpm build` on pull requests and on pushes to `main`.

## Coding Style & Naming Conventions
- TypeScript with two-space indentation, single quotes and no semicolons, matching the existing sources. Payload collection files are `PascalCase` (`src/collections/Songs.ts`), helper modules are `kebab-case` or lowercase (`src/lib/html-to-lexical.ts`, `src/lib/session.ts`), and route files stay `route.ts` or `page.tsx`.
- App code imports through the `@/*` alias for `src/` and `@payload-config` for the Payload config rather than deep relative paths. Scripts under `scripts/` use relative imports, because they run through the Payload CLI instead of the Next.js bundler.
- Keep Workers runtime constraints in mind: workerd has no Node.js filesystem, so anything touching `fs`, a local path or the Payload CLI belongs in `scripts/` or in the platform proxy branch of `src/payload.config.ts`, never in request handling.
- There is no linter configured. Match the surrounding code and rely on `pnpm typecheck` and the build.

## Testing Guidelines
- No unit test runner is configured yet. Verify a change by running `pnpm typecheck` and `pnpm build`, then exercising the routes against `pnpm dev`.
- For the gated routes, assert the status codes from `src/app/api/session/route.ts` and `src/app/api/songbook/route.ts`: `401` without a valid session token, `403` for a challenge failure, `500` when `SESSION_SIGNING_SECRET` or `TURNSTILE_SECRET` is missing. Cloudflare's always-pass Turnstile test keys produce `403` by design, because they return no `action`.
- When a change touches the import flow, rerun `pnpm migrate` and `pnpm import:songs` and confirm the reported song and category counts.
- If you add a test runner, wire it into `.github/workflows/checks.yml` in the same pull request.

## Commit & Pull Request Guidelines
- Write concise, present-tense commit subjects that say what the change does, and reference tickets in the body rather than the subject. Keep commits small and intentional.
- Each PR should include: a short problem statement, a bullet summary of changes, and testing notes naming the commands run and their observed results.
- Call out schema and data steps explicitly: whether `pnpm migrate:create` produced a new migration, and whether `pnpm import:songs` has to run against a fresh database.
- Include screenshots or a short clip for changes to the start screen or the admin panel.

## Environment & Configuration
- `.dev.vars` holds the local secrets and stays gitignored. `.dev.vars.example` documents every variable and is committed; update it whenever a variable is added or removed.
- `PAYLOAD_SECRET`, `SESSION_SIGNING_SECRET` and `TURNSTILE_SECRET` are secrets and are set with `wrangler secret put` in a deployment. `TURNSTILE_SITE_KEY` and `TURNSTILE_HOSTNAMES` are plain `vars` in `wrangler.jsonc` and are safe to commit.
- `pnpm dev` reads `.env` rather than `.dev.vars`, so export the same variables in the shell or add a gitignored `.env` when running the dev server.
- Schema changes require a generated migration under `src/migrations`, checked in with the collection change. Do not handcraft migration files: run `pnpm migrate:create` and review its output.
- Keep the local `database_id` placeholder in `wrangler.jsonc` out of production. A real deployment replaces it with the id of the D1 database it uses.
