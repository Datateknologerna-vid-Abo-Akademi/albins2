import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'

import { createSessionToken } from '@/lib/session'
import { readSongbook } from '@/lib/songbook'
import { checkTurnstile } from '@/lib/turnstile'

// Never statically generated and never cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' } as const

/**
 * The local development twin of `POST /api/unlock` on the small api Worker. It
 * verifies the challenge, issues the session token and answers with the
 * songbook in the same response, so the start screen needs one request. The
 * deployed apex is served by the api Worker; this route exists so `pnpm dev`
 * has the same endpoint.
 */
export async function POST(request: Request) {
  const sessionSecret = process.env.SESSION_SIGNING_SECRET
  if (!sessionSecret) {
    console.error('[api/unlock] SESSION_SIGNING_SECRET is not set, refusing to issue a token.')
    return NextResponse.json(
      { detail: 'Session signing is not configured.' },
      { headers: NO_STORE, status: 500 },
    )
  }

  const gate = await checkTurnstile(request, {
    hostnames: process.env.TURNSTILE_HOSTNAMES,
    logTag: '[api/unlock]',
    secret: process.env.TURNSTILE_SECRET,
  })

  if (gate.kind === 'rejected') {
    return NextResponse.json({ detail: gate.detail }, { headers: NO_STORE, status: gate.status })
  }

  const { env } = await getCloudflareContext({ async: true })
  const result = await readSongbook(env.DB)

  if (result.kind === 'error') {
    return NextResponse.json(
      { detail: result.detail },
      { headers: NO_STORE, status: result.status },
    )
  }

  const session = await createSessionToken(sessionSecret)

  return NextResponse.json(
    { token: session.token, expiry: session.expiry, songbook: result.songbook },
    { headers: NO_STORE },
  )
}
