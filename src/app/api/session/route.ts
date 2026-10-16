import { NextResponse } from 'next/server'

import { createSessionToken } from '@/lib/session'
import { checkTurnstile } from '@/lib/turnstile'

// Never statically generated and never cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' } as const

export async function POST(request: Request) {
  const sessionSecret = process.env.SESSION_SIGNING_SECRET
  if (!sessionSecret) {
    console.error('[api/session] SESSION_SIGNING_SECRET is not set, refusing to issue a token.')
    return NextResponse.json(
      { detail: 'Session signing is not configured.' },
      { headers: NO_STORE, status: 500 },
    )
  }

  const gate = await checkTurnstile(request, {
    hostnames: process.env.TURNSTILE_HOSTNAMES,
    logTag: '[api/session]',
    secret: process.env.TURNSTILE_SECRET,
  })

  if (gate.kind === 'rejected') {
    return NextResponse.json({ detail: gate.detail }, { headers: NO_STORE, status: gate.status })
  }

  const session = await createSessionToken(sessionSecret)

  return NextResponse.json(session, { headers: NO_STORE })
}
