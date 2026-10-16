/**
 * The Turnstile gate for the session token.
 *
 * Shared by the Next.js routes (which keep working for local development) and
 * by the small api Worker, so there is one copy of the siteverify logic to
 * drift. The hostname allowlist and the secret arrive as arguments rather than
 * being read from a global: the Next routes read them from `process.env`, while
 * a Worker reads them from its `env`.
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_TIMEOUT_MS = 10_000

export const MAX_TURNSTILE_TOKEN_LENGTH = 2048

/** Must match the widget's `action`. */
export const EXPECTED_TURNSTILE_ACTION = 'session'

export type TurnstileOutcome = {
  success?: boolean
  action?: string
  hostname?: string
  'error-codes'?: string[]
}

export type TurnstileVerification = {
  allowed: boolean
  outcome: TurnstileOutcome
  reasons: string[]
}

/**
 * The shared outcome of the gate: either the challenge passed, or the caller
 * answers with `detail` at `status`. Every challenge failure is one generic 403
 * that never says which check failed; a missing secret is a 500, because that
 * is a configuration fault rather than a rejected visitor. The reason is only
 * ever logged server side.
 */
export type TurnstileGate =
  | { kind: 'allowed'; outcome: TurnstileOutcome }
  | { kind: 'rejected'; status: 403 | 500; detail: string }

/** Reads the Turnstile response token from JSON, form data or a query string. */
export async function readTurnstileToken(request: Request): Promise<string | null> {
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
export async function verifyTurnstile(
  secret: string,
  token: string,
  request: Request,
  hostnames: string | undefined,
): Promise<TurnstileVerification> {
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

  const outcome = (await response.json()) as TurnstileOutcome

  const expectedHostnames = (hostnames ?? '')
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

/**
 * The whole gate: read the token, verify it, and answer with the shared 403 or
 * the configuration 500. `logTag` prefixes the server side log lines, so a
 * message still names the endpoint that took the request.
 */
export async function checkTurnstile(
  request: Request,
  options: { secret: string | undefined; hostnames: string | undefined; logTag: string },
): Promise<TurnstileGate> {
  if (!options.secret) {
    console.error(
      `${options.logTag} TURNSTILE_SECRET is not set, refusing to issue a token. Use the Turnstile test keys for local development instead of disabling the challenge.`,
    )
    return {
      detail: 'Turnstile verification is not configured.',
      kind: 'rejected',
      status: 500,
    }
  }

  const responseToken = await readTurnstileToken(request)
  if (!responseToken || responseToken.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    return { detail: 'Forbidden.', kind: 'rejected', status: 403 }
  }

  try {
    const { allowed, outcome, reasons } = await verifyTurnstile(
      options.secret,
      responseToken,
      request,
      options.hostnames,
    )

    if (!allowed) {
      console.warn(
        `${options.logTag} Turnstile rejected the request: ${reasons.join('; ')}; error-codes=${JSON.stringify(outcome['error-codes'] ?? [])}`,
      )
      return { detail: 'Forbidden.', kind: 'rejected', status: 403 }
    }

    return { kind: 'allowed', outcome }
  } catch (error) {
    console.error(`${options.logTag} Turnstile verification error: ${String(error)}`)
    return { detail: 'Forbidden.', kind: 'rejected', status: 403 }
  }
}
