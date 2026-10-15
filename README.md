# Albins on Cloudflare Workers

Albins is Datateknologerna's digital songbook. This repository holds the whole
service: Payload CMS 3 and Next.js 16 running on Cloudflare Workers with a D1
database. It serves the public start screen, the session and songbook API, and
the Payload admin panel used to edit the content.

## Prerequisites

- Node.js 20.9 or newer
- pnpm 10 or newer
- No Cloudflare account is needed for local development

## Setup

```sh
pnpm install
```

Copy `.dev.vars.example` to `.dev.vars` (gitignored) and fill in the secrets.
`pnpm dev` reads `.env` instead of `.dev.vars`, so for a local dev server
either create `.env` with the same variables or export them in the shell:

```sh
export PAYLOAD_SECRET="$(openssl rand -hex 32)"
export SESSION_SIGNING_SECRET="$(openssl rand -hex 32)"
```

`.dev.vars.example` suggests the widget's real site key and secret, plus
`localhost` and `127.0.0.1` as the reported hostnames. Passing the gate locally
needs all three, which means the widget must have `localhost` registered.

To exercise only the rejection paths, Cloudflare's always-pass test keys work:
set `TURNSTILE_SECRET` to `1x0000000000000000000000000000000AA`,
`TURNSTILE_SITE_KEY` to `1x00000000000000000000AA` and `TURNSTILE_HOSTNAMES` to
`example.com`. The gate then always returns 403, because the test keys return
`success: true` and `hostname: "example.com"` but no `action`, so the action
check rejects them. That is the intended behaviour, not a bug.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PAYLOAD_SECRET` | yes | Signs admin sessions and tokens. A secret. |
| `SESSION_SIGNING_SECRET` | yes | HMAC key for the `/api/songbook` session token. A secret. |
| `TURNSTILE_SECRET` | yes | Verifies the Turnstile response token in `POST /api/session`. A secret. The route fails closed without it and never issues a token. |
| `TURNSTILE_SITE_KEY` | yes | Public site key rendered into the start screen. A plain var in `wrangler.jsonc`, safe to commit. |
| `TURNSTILE_HOSTNAMES` | yes | Comma separated hostnames that siteverify must report. A plain var in `wrangler.jsonc`. An empty list rejects every request rather than allowing any hostname. |

`PAYLOAD_SECRET`, `SESSION_SIGNING_SECRET` and `TURNSTILE_SECRET` are secrets
that must never be committed. Locally they live in `.dev.vars`; in a deployment
they are set with `wrangler secret put` (see Deploy below).

## Local development

The D1 binding is provided by wrangler's local platform proxy, so `next dev`
and the Payload CLI do not need a running `wrangler dev` process and no
Cloudflare account. Both share the same local database file under
`.wrangler/state`, which is gitignored.

```sh
# 1. Generate or update migrations when the schema changes.
pnpm migrate:create --name add-something

# 2. Apply the migrations to the local D1 database.
pnpm migrate

# 3. Seed the local database from the read-only production export.
#    The script is idempotent: rerunning it updates instead of duplicating.
pnpm import:songs

# 4. Start the dev server on http://localhost:3000.
pnpm dev
```

Deleting `.wrangler/state` starts from an empty database, after which steps 2
and 3 have to be repeated.

`pnpm import:songs` reads `.migration/songs-export.json` by default and accepts
an override through `SONGS_EXPORT_PATH`. The export is a read-only copy of the
production corpus, and `.migration/` stays gitignored. The script is a local
and CI script: it runs through `payload run` and is never imported by the
Worker.

## Routes

| Route | Description |
| --- | --- |
| `GET /` | Public start screen. Renders the Turnstile widget with `TURNSTILE_SITE_KEY`, then stores the session token it receives. |
| `POST /api/session` | Requires a valid Turnstile response token, then returns `{ "token": "...", "expiry": "<ISO 8601>" }`. The token is an HMAC-SHA256 signed, stateless session token valid for 12 hours. |
| `GET /api/songbook` | Requires `Authorization: Bearer <token>`. Returns the songbook with its categories and songs, using the field names `category_name`, `audio`, `page_number` and `negative_page_number`. Responds `401` with `{"detail": "..."}` for a missing, invalid or expired token. |
| `GET /admin` | Payload admin panel. The first user created there becomes an admin. |
| `/api/*` | Payload's own REST and GraphQL API. |

`/api/session` and `/api/songbook` send `Cache-Control: no-store` and are
dynamic.

## Turnstile

`POST /api/session` is gated on a Cloudflare Turnstile challenge, so a script
that calls the API directly cannot obtain a session token. The start screen
solves the challenge and posts the resulting `cf-turnstile-response` token.

The server requires all three of:

- `success === true` from siteverify
- `action === "session"`, matching the widget's `data-action`
- a reported `hostname` present in `TURNSTILE_HOSTNAMES`

It fails closed. A missing token, an unexpected action, an unexpected hostname,
an unconfigured allowlist, a network error, a non-2xx response and a missing
`TURNSTILE_SECRET` all refuse to issue a token, and every challenge failure
returns the same `403 {"detail": "Forbidden."}` so a caller cannot learn which
check rejected it. The reason is logged server side only. Turnstile response
tokens are single use, so the client resets the widget before a retry.

`TURNSTILE_SITE_KEY` and `TURNSTILE_HOSTNAMES` are plain `vars`. The secret is
set with:

```sh
wrangler secret put TURNSTILE_SECRET
```

The widget must have every hostname it is served from registered. Never put
`localhost`, `127.0.0.1` or `example.com` in a deployed `TURNSTILE_HOSTNAMES`
value.

## Access control

The `songbooks`, `categories` and `songs` collections are readable only by an
authenticated admin user, so Payload's own REST and GraphQL API is not a public
scrape surface. An unauthenticated `GET /api/songs` returns an empty document
list rather than content.

Public content is served exclusively by `GET /api/songbook`, which checks the
signed session token and then reads through the Payload Local API. That route
is the only public read path, and it reads with Payload's default
`overrideAccess`, because the gate is the session token rather than a Payload
user.

Writes to content require the `admin` or `editor` role. Creating and deleting
users requires `admin`, and only an `admin` may change the `roles` field.

## Collections

- `users`: Payload auth with `email`, `password` and `roles` (`admin`, `editor`).
- `songbooks`: `name`, unique.
- `categories`: `name`, `order`, `songbook`. A unique index enforces one name
  per songbook.
- `songs`: `title`, `melody`, `author`, `content` (Lexical), `pageNumber`,
  `negativePageNumber`, `order`, `category`.

Ordering is kept in explicit `order` numbers that use increments of 10. The
`orderable` plugin is deliberately not used: it renders a blank admin page on
Workers.

## Migrations

Migrations live in `src/migrations` and are generated by
`pnpm migrate:create`. `pnpm migrate` applies them to whichever database the
current environment points at: locally the wrangler platform proxy, and in a
deployment the remote D1 database when `NODE_ENV=production` is set.

## Build

```sh
pnpm typecheck                  # tsc --noEmit
pnpm build                      # next build --webpack
pnpm build:worker               # opennextjs-cloudflare build, writes .open-next/worker.js
pnpm preview                    # build and serve the Worker bundle locally
pnpm generate:cloudflare-types  # regenerate cloudflare-env.d.ts from wrangler.jsonc
```

`.github/workflows/checks.yml` runs `pnpm install --frozen-lockfile`,
`pnpm typecheck` and `pnpm build` on pull requests and on pushes to `main`.

`pnpm build` runs Next.js with webpack rather than Turbopack. Payload asks the
bundler to keep `drizzle-kit` external, because it is a dependency of the SQL
adapters rather than a direct dependency of this app, and Turbopack emits that
external under a mangled module name that the OpenNext bundler then cannot
resolve.

## Deploy

Create the D1 database once, then copy its id into the `d1_databases` entry in
`wrangler.jsonc`, replacing the placeholder:

```sh
wrangler d1 create albins
```

Apply the migrations to the remote database and set the secrets:

```sh
NODE_ENV=production pnpm migrate
wrangler secret put PAYLOAD_SECRET
wrangler secret put SESSION_SIGNING_SECRET
wrangler secret put TURNSTILE_SECRET
```

Build the Worker bundle and deploy it:

```sh
pnpm build:worker
pnpm exec opennextjs-cloudflare deploy
```

`wrangler.jsonc` intentionally has no route or custom domain yet, so nothing is
served from a hostname until that is added.
