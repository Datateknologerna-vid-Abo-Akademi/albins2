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
| `GET /` | Public start screen: the Albin logo, the button that solves the Turnstile challenge and posts the resulting `cf-turnstile-response` token to `POST /api/unlock`, then stores the session token it receives under `auth` in `localStorage` and seeds the category cache from the songbook in the same response. |
| `POST /api/session` | Requires a valid Turnstile response token, then returns `{ "token": "...", "expiry": "<ISO 8601>" }`. The token is an HMAC-SHA256 signed, stateless session token valid for 12 hours. |
| `POST /api/unlock` | Same challenge, and answers with `{ "token": "...", "expiry": "<ISO 8601>", "songbook": { ... } }` in one response, so the start screen needs one request instead of two. Every challenge failure is the same `403 {"detail": "Forbidden."}` `POST /api/session` returns, and never a token. |
| `GET /api/songbook` | Requires `Authorization: Bearer <token>`. Returns the songbook with its categories and songs, using the field names `category_name`, `audio`, `page_number` and `negative_page_number`. Responds `401` with `{"detail": "..."}` for a missing, invalid or expired token. |
| `GET /admin` | Payload admin panel. The first user created there becomes an admin. |
| `/api/*` | Payload's own REST and GraphQL API. |

`/api/session`, `/api/unlock` and `/api/songbook` send `Cache-Control: no-store`
and are dynamic.

## The api Worker

The public read path is served by a second, small Worker rather than by the
Next.js one. The Next.js isolate evaluates Next, Payload's admin and the rest of
a bundle of several megabytes before it can answer the first request of a
session, which measured 275 to 605 ms of CPU against 13 to 50 ms warm. The
songbook read does not need any of that: `content_html` is rendered when a song
is written, so the read path needs neither Payload nor the Lexical converter.

| | |
| --- | --- |
| Entry point | `src/api-worker/index.ts`, compiled by wrangler itself |
| Config | `wrangler.api.jsonc`, Worker name `albins-api` |
| Routes | `albins.app/api/unlock*` and `albins.app/api/songbook*` only, so `albins.app/*` stays with the Next.js Worker |
| Bindings | the same `DB` D1 database, `TURNSTILE_HOSTNAMES` as a var, and the two secrets |
| Imports | nothing from Next, Payload, Lexical or React |

It shares `src/lib/session.ts`, `src/lib/songbook.ts` and `src/lib/turnstile.ts`
with the Next.js routes, so the response shape and the challenge checks have one
implementation. Both endpoints also exist in the Next app, as
`src/app/api/unlock/route.ts` and `src/app/api/songbook/route.ts`, so `pnpm dev`
has them without wrangler.

Every response carries `x-albins-api: 1`, which says from the outside which
Worker answered a request. The Worker is reachable only through its two routes:
`workers_dev` and preview URLs are off, so there is no third public entry point.

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
`POST /api/unlock` runs the same challenge through the same shared code in
`src/lib/turnstile.ts`, and answers with the token and the songbook together.

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
signed session token and then reads the `songbooks`, `categories` and `songs`
tables from D1 directly instead of going through the Payload Local API, because
Payload's initialisation is the largest cost on a cold isolate. The session
token is the gate, so no Payload user is involved.

Writes to content require the `admin` or `editor` role. Creating and deleting
users requires `admin`, and only an `admin` may change the `roles` field.

## The first user

Payload bootstraps the panel through an unauthenticated first-user flow that is
available only while the `users` collection is empty, and that flow is **not**
gated by collection access control. Two consequences matter:

- Create the first user immediately after the first deploy. Until it exists,
  anyone who finds `/admin` can claim it.
- The form defaults the role to `editor`, and an editor can neither create users
  nor change roles, so that default would lock administration out for good. A
  `beforeChange` hook on `users` therefore forces the first account to
  `roles: ["admin"]` whatever the request asked for.

## Password hashing on Workers

Payload hashes passwords with PBKDF2 at 600,000 iterations, and workerd refuses
any count above 100,000, so on Cloudflare **no user can be created or logged in
at all**. There is no option for it in `auth`, so `patches/payload@3.90.2.patch`
lowers the constant to the runtime ceiling.

That patch is load-bearing: the stored hash prefix does not record the iteration
count, so the reader uses the same constant. Removing the patch, or upgrading
Payload without re-applying it, breaks login for every existing user rather than
merely weakening it. After any Payload upgrade, check that the constant is
patched and that `POST /api/users/login` still returns `200`.

Note also that rotating `PAYLOAD_SECRET` does not log anyone out. Payload 3 keeps
sessions in the `users_sessions` table, so revocation means deleting the session
row.

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

`pnpm build` builds the Next.js app. `pnpm build:worker` is the OpenNext step that
turns it into a Worker, and it runs the Next.js build itself, so it does not need
`pnpm build` first. The entry point in `wrangler.jsonc` is `.open-next/worker.js`,
which only `build:worker` produces, so that is the command a deploy pipeline has
to run.

Do not point a build pipeline at `pnpm build` and do not redefine `build` to run
the OpenNext build: the OpenNext build invokes the package `build` script to
build the Next.js app, so either mistake leaves no Worker bundle or recurses
until the runner cancels it. That recursion is what a Workers Builds run did when
`build` briefly meant `opennextjs-cloudflare build`.

`.github/workflows/checks.yml` runs `pnpm install --frozen-lockfile`,
`pnpm typecheck` and `pnpm build` on pull requests and on pushes to `main`.

The Next.js build runs with webpack rather than Turbopack. Payload asks the
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

The api Worker is deployed separately, from its own config:

```sh
wrangler secret put TURNSTILE_SECRET -c wrangler.api.jsonc
wrangler secret put SESSION_SIGNING_SECRET -c wrangler.api.jsonc
wrangler deploy -c wrangler.api.jsonc
```

Both secrets must be the values the `albins` Worker already has.
`SESSION_SIGNING_SECRET` in particular: `POST /api/unlock` on one Worker issues
a token that `GET /api/songbook` verifies, and while a client that predates this
change still exchanges its challenge through `POST /api/session` on the `albins`
Worker, a different key there rejects every session token a visitor already
holds. Setting the two Workers to the same key is what makes attaching the
routes safe before the new client bundle is deployed.

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

## Continuous deployment

The Worker is connected to this repository through Cloudflare Workers Builds, so
a push builds and deploys it. Those settings live in the dashboard rather than in
the repository, so they are recorded here, along with why they work.

Workers Builds deploys `albins` only. The api Worker has no build step, so a push
never deploys it: it is deployed by hand with
`wrangler deploy -c wrangler.api.jsonc`, and its two routes are attached by that
same command.

| Setting | Value |
| --- | --- |
| Build command | `pnpm run build:worker` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Production branch | `main` |
| Build variables | none |

No `PNPM_VERSION` build variable is needed. The build image ships pnpm 10.11.1 by
default, and pnpm 10 cannot read this repository's `pnpm-workspace.yaml`, which
carries `allowBuilds` and `patchedDependencies` but no `packages` field, so it
stops with `ERROR packages field missing or empty`. The `packageManager` field in
`package.json` overrides that default, and the build log confirms it: the build
image reports `Detected the following tools from environment: pnpm@11.23.0`.

The build command has to be `build:worker`, not `build`. The entry point in
`wrangler.jsonc` is `.open-next/worker.js`, which only the OpenNext step writes,
and the OpenNext build runs the package `build` script itself, so pointing the
pipeline at `build` both omits the Worker bundle and risks recursion.

These settings are scoped, and the dashboard shows a `Production` and a
`Previews Base` tab for each of them. A pull request is built with the preview
scope, so both tabs need the same values. Setting only `Production` leaves every
pull request building with the plain Next.js build, which then has no Worker
bundle for the deploy step to find, and the failure looks identical to a build
command that was never changed at all.
