import { NextResponse } from 'next/server'

import { createSessionToken } from '@/lib/session'

// Never statically generated and never cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_TIMEOUT_MS = 10_000
const MAX_TURNSTILE_TOKEN_LENGTH = 2048
const EXPECTED_TURNSTILE_ACTION = 'session'

const NO_STORE = { 'Cache-Control': 'no-store' } as const

/**
 * One response for every challenge failure, so a caller cannot tell which check
 * rejected it. The reason is logged server side instead.
 */
function forbidden() {
  return NextResponse.json({ detail: 'Forbidden.' }, { headers: NO_STORE, status: 403 })
}

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
 * Verifies the Turnstile token against siteverify.
 *
 * Fails closed: a network error or a non-2xx response throws, and the caller
 * turns that into a 403. The hostname allowlist is required rather than
 * optional, so an unset TURNSTILE_HOSTNAMES rejects instead of accepting any
 * hostname that siteverify happens to report.
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
    action?: string
    hostname?: string
    'error-codes'?: string[]
  }

  const expectedHostnames = (process.env.TURNSTILE_HOSTNAMES ?? '')
    .split(',')
    .map((hostname) => hostname.trim())
    .filter(Boolean)

  const reasons: string[] = []

  if (!outcome.success) {
    reasons.push('siteverify rejected the token')
  }

  if (expectedHostnames.length === 0) {
    reasons.push('TURNSTILE_HOSTNAMES is not configured')
  } else if (!expectedHostnames.includes(outcome.hostname ?? '')) {
    reasons.push(`unexpected hostname ${JSON.stringify(outcome.hostname ?? '')}`)
  }

  if (outcome.action !== EXPECTED_TURNSTILE_ACTION) {
    reasons.push(`unexpected action ${JSON.stringify(outcome.action ?? '')}`)
  }

  return { allowed: reasons.length === 0, outcome, reasons }
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

  const turnstileSecret = process.env.TURNSTILE_SECRET
  if (!turnstileSecret) {
    console.error(
      '[api/session] TURNSTILE_SECRET is not set, refusing to issue a token. Use the Turnstile test keys for local development instead of disabling the challenge.',
    )
    return NextResponse.json(
      { detail: 'Turnstile verification is not configured.' },
      { headers: NO_STORE, status: 500 },
    )
  }

  const responseToken = await readTurnstileToken(request)
  if (!responseToken || responseToken.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    return forbidden()
  }

  try {
    const { allowed, outcome, reasons } = await verifyTurnstile(
      turnstileSecret,
      responseToken,
      request,
    )

    if (!allowed) {
      console.warn(
        `[api/session] Turnstile rejected the request: ${reasons.join('; ')}; error-codes=${JSON.stringify(outcome['error-codes'] ?? [])}`,
      )
      return forbidden()
    }
  } catch (error) {
    console.error(`[api/session] Turnstile verification error: ${String(error)}`)
    return forbidden()
  }

  const session = await createSessionToken(sessionSecret)

  return NextResponse.json(session, { headers: NO_STORE })
}
