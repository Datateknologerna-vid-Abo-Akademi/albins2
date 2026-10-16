/**
 * The public read path as its own Worker.
 *
 * The songbook is served by the big Next.js and Payload Worker too, but that
 * isolate evaluates a bundle of several megabytes before it can answer, which
 * is 275 to 605 ms of CPU on the first request of a session. This Worker holds
 * only the session token, the Turnstile gate and the D1 read, so a cold isolate
 * has almost nothing to evaluate. It imports nothing from Next, Payload or
 * Lexical on purpose: adding one of those back undoes the point of the split.
 *
 * `wrangler.api.jsonc` owns the two routes, so the apex still belongs to the
 * main Worker everywhere else.
 */

import { readSongbook } from '../lib/songbook'
import { createSessionToken, readSessionToken, verifySessionToken } from '../lib/session'
import { checkTurnstile } from '../lib/turnstile'

export interface Env {
  DB: D1Database
  SESSION_SIGNING_SECRET?: string
  TURNSTILE_HOSTNAMES?: string
  TURNSTILE_SECRET?: string
}

// `x-albins-api` is a probe header: the deployed apex is served by two Workers
// and this says from the outside which one answered. Keep it.
const NO_STORE = { 'Cache-Control': 'no-store', 'x-albins-api': '1' } as const

function json(body: unknown, status: number): Response {
  return Response.json(body, { headers: NO_STORE, status })
}

const unauthorized = (detail: string) => json({ detail }, 401)

/**
 * `curl -sI` sends HEAD, and the route has to answer it the same way as GET so
 * the probe header is visible from the outside.
 */
function withoutBodyIfHead(request: Request, response: Response): Response {
  if (request.method !== 'HEAD') {
    return response
  }

  return new Response(null, { headers: response.headers, status: response.status })
}

async function handleSongbook(request: Request, env: Env): Promise<Response> {
  const sessionSecret = env.SESSION_SIGNING_SECRET
  if (!sessionSecret) {
    console.error(
      '[api/songbook] SESSION_SIGNING_SECRET is not set, refusing to serve the songbook.',
    )
    return json({ detail: 'Session signing is not configured.' }, 500)
  }

  const token = readSessionToken(request)
  if (!token) {
    return unauthorized('Authentication credentials were not provided.')
  }

  const session = await verifySessionToken(sessionSecret, token)
  if (!session) {
    return unauthorized('Invalid or expired token.')
  }

  const result = await readSongbook(env.DB)

  if (result.kind === 'error') {
    return json({ detail: result.detail }, result.status)
  }

  return json(result.songbook, 200)
}

/**
 * One request: verify the challenge, then answer with the session token and the
 * songbook. Every challenge failure is the same generic 403 the session route
 * returns, and never a token.
 */
async function handleUnlock(request: Request, env: Env): Promise<Response> {
  const sessionSecret = env.SESSION_SIGNING_SECRET
  if (!sessionSecret) {
    console.error('[api/unlock] SESSION_SIGNING_SECRET is not set, refusing to issue a token.')
    return json({ detail: 'Session signing is not configured.' }, 500)
  }

  const gate = await checkTurnstile(request, {
    hostnames: env.TURNSTILE_HOSTNAMES,
    logTag: '[api/unlock]',
    secret: env.TURNSTILE_SECRET,
  })

  if (gate.kind === 'rejected') {
    return json({ detail: gate.detail }, gate.status)
  }

  const result = await readSongbook(env.DB)

  if (result.kind === 'error') {
    return json({ detail: result.detail }, result.status)
  }

  const session = await createSessionToken(sessionSecret)

  return json({ token: session.token, expiry: session.expiry, songbook: result.songbook }, 200)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // The routes config sends only these two paths here, but match on the
    // normalised path anyway so `/api/songbook/` behaves like `/api/songbook`.
    const pathname = new URL(request.url).pathname.replace(/\/+$/, '') || '/'

    let response: Response

    if (pathname === '/api/unlock') {
      response =
        request.method === 'POST'
          ? await handleUnlock(request, env)
          : json({ detail: 'Method not allowed.' }, 405)
    } else if (pathname === '/api/songbook') {
      response =
        request.method === 'GET' || request.method === 'HEAD'
          ? await handleSongbook(request, env)
          : json({ detail: 'Method not allowed.' }, 405)
    } else {
      response = json({ detail: 'Not found.' }, 404)
    }

    return withoutBodyIfHead(request, response)
  },
} satisfies ExportedHandler<Env>
