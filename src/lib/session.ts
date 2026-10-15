/**
 * Stateless session tokens for the public songbook route.
 *
 * The token is `<base64url(payload)>.<base64url(HMAC-SHA256(payload))>` and is
 * verified with the Web Crypto API, so the same code runs in workerd and in
 * Node.js during development.
 */

export const SESSION_TTL_SECONDS = 12 * 60 * 60
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000

const MAX_TOKEN_LENGTH = 4096
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type SessionPayload = {
  /** Issued at, seconds since the epoch. */
  iat: number
  /** Expiry, seconds since the epoch. */
  exp: number
}

export type IssuedSession = {
  token: string
  /** ISO 8601 expiry, this exact field name is part of the client contract. */
  expiry: string
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign', 'verify'],
  )
}

export async function createSessionToken(
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<IssuedSession> {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + ttlSeconds
  const payload: SessionPayload = { exp: expiresAt, iat: issuedAt }
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign(
    'HMAC',
    await importKey(secret),
    encoder.encode(encodedPayload),
  )

  return {
    token: `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`,
    expiry: new Date(expiresAt * 1000).toISOString(),
  }
}

/**
 * Returns the payload of a valid, unexpired token and null for anything else.
 */
export async function verifySessionToken(
  secret: string,
  token: string,
): Promise<SessionPayload | null> {
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null
  }

  const [encodedPayload, encodedSignature] = parts

  let valid: boolean
  try {
    valid = await crypto.subtle.verify(
      'HMAC',
      await importKey(secret),
      fromBase64Url(encodedSignature),
      encoder.encode(encodedPayload),
    )
  } catch {
    return null
  }

  if (!valid) {
    return null
  }

  let payload: SessionPayload
  try {
    payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as SessionPayload
  } catch {
    return null
  }

  if (typeof payload?.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    return null
  }

  return payload
}

const TOKEN_SCHEMES = new Set(['bearer', 'token'])

/**
 * Reads the session token from the Authorization header. `Bearer` is the
 * documented scheme; `Token` and a bare token are accepted because the
 * existing client stores the token without a scheme.
 */
export function readSessionToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) {
    return null
  }

  const trimmed = header.trim()
  const parts = trimmed.split(/\s+/)

  if (parts.length === 2 && TOKEN_SCHEMES.has(parts[0].toLowerCase())) {
    return parts[1] || null
  }

  if (parts.length === 1) {
    return trimmed || null
  }

  return null
}
