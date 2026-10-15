import { NextResponse } from 'next/server'

import { createSessionToken } from '@/lib/session'

// Never statically generated and never cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_TIMEOUT_MS = 10_000
const MAX_TURNSTILE_TOKEN_LENGTH = 2048

const NO_STORE = { 'Cache-Control': 'no-store' } as const

/** Reads the Turnstile response token from JSON, form data or a query string. */
async function readTurnstileToken(request: Request): Promise<string | null> {
  const contentType = request.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as Record<string, unknown> | null
      const candidate = body?.['cf-turnstile-response'] ?? body?.token
      return typeof candidate === 'string' && candidate ? candidate : null
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData()
      const candidate = form.get('cf-turnstile-response') ?? form.get('token')
      return typeof candidate === 'string' && candidate ? candidate : null
    }
  } catch {
    return null
  }

  return new URL(request.url).searchParams.get('cf-turnstile-response')
}

/**
 * Verifies the Turnstile token against siteverify. Fails closed on a network
 * error or a non-2xx response.
 */
async function verifyTurnstile(secret: string, token: string, request: Request) {
  const body = new URLSearchParams({ response: token, secret })
  const clientIp =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (clientIp) {
    body.set('remoteip', clientIp)
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`siteverify responded with ${response.status}`)
  }

  const outcome = (await response.json()) as {
    success?: boolean
    hostname?: string
    'error-codes'?: string[]
  }

  const expectedHostnames = (process.env.TURNSTILE_HOSTNAMES ?? '')
    .split(',')
    .map((hostname) => hostname.trim())
    .filter(Boolean)

  const hostnameAllowed =
    expectedHostnames.length === 0 || expectedHostnames.includes(outcome.hostname ?? '')

  return { allowed: Boolean(outcome.success) && hostnameAllowed, outcome }
}

export async function POST(request: Request) {
  const sessionSecret = process.env.SESSION_SIGNING_SECRET
  if (!sessionSecret) {
    console.error('[api/session] SESSION_SIGNING_SECRET is not set, refusing to issue a token.')
    return NextResponse.json(
      { detail: 'Session signing is not configured.' },
      { headers: NO_STORE, status: 500 },
    )
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY

  if (turnstileSecret) {
    const responseToken = await readTurnstileToken(request)

    if (!responseToken || responseToken.length > MAX_TURNSTILE_TOKEN_LENGTH) {
      return NextResponse.json(
        { detail: 'A Turnstile response token is required.' },
        { headers: NO_STORE, status: 400 },
      )
    }

    try {
      const { allowed, outcome } = await verifyTurnstile(turnstileSecret, responseToken, request)
      if (!allowed) {
        console.warn(
          `[api/session] Turnstile verification failed: ${JSON.stringify(outcome['error-codes'] ?? [])}`,
        )
        return NextResponse.json(
          { detail: 'Turnstile verification failed.' },
          { headers: NO_STORE, status: 403 },
        )
      }
    } catch (error) {
      console.error(`[api/session] Turnstile verification error: ${String(error)}`)
      return NextResponse.json(
        { detail: 'Turnstile verification is unavailable.' },
        { headers: NO_STORE, status: 403 },
      )
    }
  } else {
    console.warn(
      '[api/session] TURNSTILE_SECRET_KEY is not set, issuing a session token without a Turnstile challenge. Set it before deploying.',
    )
  }

  const session = await createSessionToken(sessionSecret)

  return NextResponse.json(session, { headers: NO_STORE })
}
