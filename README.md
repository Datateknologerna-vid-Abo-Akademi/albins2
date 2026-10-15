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
| `GET /` | Public start screen: the Albin logo, the button that solves the Turnstile challenge and `POST /api/session` with the resulting `cf-turnstile-response` token, then stores the session token it receives under `auth` in `localStorage`. |
| `POST /api/session` | Requires a valid Turnstile response token, then returns `{ "token": "...", "expiry": "<ISO 8601>" }`. The token is an HMAC-SHA256 signed, stateless session token valid for 12 hours. |
| `GET /api/songbook` | Requires `Authorization: Bearer <token>`. Returns the songbook with its categories and songs, using the field names `category_name`, `audio`, `page_number` and `negative_page_number`. Responds `401` with `{"detail": "..."}` for a missing, invalid or expired token. |
| `GET /admin` | Payload admin panel. The first user created there becomes an admin. |
| `/api/*` | Payload's own REST and GraphQL API. |

`/api/session` and `/api/songbook` send `Cache-Control: no-store` and are
dynamic.

## Frontend

`src/app/(frontend)/` serves the whole public client. It is the client that used
to live in the Vite application, carried across unchanged: the same CSS, the
same markup, the same swipe and peek engine, the same ranked search and the same
`localStorage` layer. Only the routing is translated, from react-router to App
Router.

| Route | File |
| --- | --- |
| `/` | `src/app/(frontend)/page.tsx`, rendering `unlock.tsx` |
| `/categories` | `src/app/(frontend)/categories/page.tsx` |
| `/songs?category=NAME` | `src/app/(frontend)/songs/page.tsx` |
| `/search` | `src/app/(frontend)/search/page.tsx` |
| `/song/[id]` | `src/app/(frontend)/song/[id]/page.tsx` |
| everything else | `src/app/(frontend)/not-found.tsx`, which redirects to `/` |

`src/app/(frontend)/components/`, `services/` and `utils/` hold the ported
modules, and `styles/` holds the stylesheets. `src/app/(frontend)/styles.css` is
the single global entry point and imports them in the order the old client
applied them.

The client talks to `GET /api/songbook` with `Authorization: Token <token>` and
caches the result in `localStorage` under `albins:categories` for 12 hours. It
reads the session it stored under `auth`; a page without a token sends the
visitor back to `/`.

Every route except `/` reads that session on the client, so a plain HTTP request
returns the server-rendered loading or redirect state. Open the routes in a
browser to see content, and serve the dev server as `localhost`: Next blocks its
assets for an origin that is not listed in `allowedDevOrigins`, so
`127.0.0.1` renders the HTML without client JavaScript.

## Offline support

`public/service-worker.js` and `public/offline.html` are the worker and the
fallback page the old client shipped. The layout registers the worker in
production builds only, as the old client did.

The precache list had to change, because it named files this app does not serve:

| Old entry | Reason | New entry |
| --- | --- | --- |
| `/index.html` | No such file; the route group serves `/` | `/` |
| `/favicon.ico` | No such file; the icon is `/Albin.svg` | `/Albin.svg` |
| `/` | Unchanged | `/` |
| `/offline.html` | Unchanged | `/offline.html` |
| - | The other client routes | `/categories`, `/search` |

The navigation fallback uses `/` as its shell, for the same reason. The runtime
cache no longer matches `/api/songbook/` with a trailing slash, because the
route is `GET /api/songbook`. The old client's cache names, its admin path
bypass, its asset cache and its 20 entry runtime cache limit are unchanged.

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

The widget must have every hostname it is served from registered. The Worker is
served from `albins.app` only. `www.albins.app` is redirected to the apex by a
zone level Redirect Rule in Cloudflare rather than by this app, so `www` must
not be bound to the Worker as a custom domain: if it were, those requests would
reach the app with a hostname the gate does not accept and would fail closed
with a `403`. The `www` DNS record still has to stay proxied for the rule to
run, and it must not point at a retired origin. Never put `localhost`,
`127.0.0.1` or `example.com` in a deployed `TURNSTILE_HOSTNAMES` value.

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
`pnpm migrate:create`. `pnpm migrate` applies them to the local database under
`.wrangler/state`.

Do not rely on `NODE_ENV=production pnpm migrate` to reach Cloudflare. It is
meant to, through wrangler's remote bindings, but it does not: miniflare keys its
local D1 state by `database_id`, so putting the real id in `wrangler.jsonc`
silently creates a fresh **local** database and the migration lands there. This
was confirmed against the live database, which stayed empty. Always verify the
remote one:

```sh
wrangler d1 execute albins --remote --command "select count(*) from songs"
```

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

Create the D1 database once and put its id in `wrangler.jsonc` in place of the
placeholder:

```sh
wrangler d1 create albins
```

Build and deploy, then set the three secrets. `TURNSTILE_SITE_KEY` and
`TURNSTILE_HOSTNAMES` are plain vars in `wrangler.jsonc` and are deployed with
the script:

```sh
pnpm build:worker
wrangler deploy
wrangler secret put PAYLOAD_SECRET
wrangler secret put SESSION_SIGNING_SECRET
wrangler secret put TURNSTILE_SECRET
```

Seed the remote database by exporting the local one and executing that dump
remotely, because `pnpm migrate` and `pnpm import:songs` only write locally:

```sh
pnpm migrate && pnpm import:songs
wrangler d1 export albins --local --output=dump.sql --skip-confirmation
wrangler d1 execute albins --remote --file=dump.sql -y
rm dump.sql
```

`wrangler.jsonc` carries the `albins.app/*` route, which is the cutover. A route
intercepts the zone's requests before they reach the origin, so the apex keeps
its existing DNS record and the cluster keeps running as the rollback path:
delete the route, redeploy, and traffic returns to it.

`www.albins.app` is redirected to the apex by a zone level Redirect Rule with a
`308`, preserving the path and query. Leave `www` unbound as a Worker custom
domain, or its requests arrive with a hostname the Turnstile gate rejects, and
keep its DNS record proxied so the rule runs.
