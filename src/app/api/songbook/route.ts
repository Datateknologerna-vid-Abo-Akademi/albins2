import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'

import { readSongbook } from '@/lib/songbook'
import { readSessionToken, verifySessionToken } from '@/lib/session'

// Never statically generated and never cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' } as const

const unauthorized = (detail: string) =>
  NextResponse.json({ detail }, { headers: NO_STORE, status: 401 })

export async function GET(request: Request) {
  const sessionSecret = process.env.SESSION_SIGNING_SECRET
  if (!sessionSecret) {
    console.error(
      '[api/songbook] SESSION_SIGNING_SECRET is not set, refusing to serve the songbook.',
    )
    return NextResponse.json(
      { detail: 'Session signing is not configured.' },
      { headers: NO_STORE, status: 500 },
    )
  }

  const token = readSessionToken(request)
  if (!token) {
    return unauthorized('Authentication credentials were not provided.')
  }

  const session = await verifySessionToken(sessionSecret, token)
  if (!session) {
    return unauthorized('Invalid or expired token.')
  }

  const { env } = await getCloudflareContext({ async: true })
  const result = await readSongbook(env.DB)

  if (result.kind === 'error') {
    return NextResponse.json(
      { detail: result.detail },
      { headers: NO_STORE, status: result.status },
    )
  }

  return NextResponse.json(result.songbook, { headers: NO_STORE })
}
