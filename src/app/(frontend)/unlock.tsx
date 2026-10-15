'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import Albin from './components/Albin'
import { clearCategoryCache, fetchCategories, getCachedCategories } from './services/categoryClient'

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script'
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Must match EXPECTED_TURNSTILE_ACTION in src/app/api/session/route.ts.
const ACTION = 'session'

// The old start screen aborted the anonymous login request after five seconds.
const LOGIN_TIMEOUT_MS = 5000

type Status = 'idle' | 'solving' | 'submitting' | 'unlocked' | 'failed'

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const LABELS: Record<Status, string> = {
  failed: 'NEEJ! ALBIN!! D:',
  idle: 'Skål!',
  solving: 'Laddar…',
  submitting: 'Laddar…',
  unlocked: 'Skål!',
}

/** Loads the Turnstile script once, then resolves with the global API. */
function loadTurnstile(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile)
      return
    }

    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')

    script.addEventListener('load', () => {
      if (window.turnstile) {
        resolve(window.turnstile)
      } else {
        reject(new Error('Turnstile did not initialise'))
      }
    })
    script.addEventListener('error', () => reject(new Error('Turnstile failed to load')))

    if (!existing) {
      script.id = TURNSTILE_SCRIPT_ID
      script.src = TURNSTILE_SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })
}

/** Reads the stored session, ignoring anything malformed. */
function getStoredAuth(): { token: string; expiry: string | null } | null {
  try {
    const raw = window.localStorage.getItem('auth')
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as { token?: unknown; expiry?: unknown }
    if (!parsed || typeof parsed.token !== 'string' || parsed.token.length === 0) {
      return null
    }

    return {
      token: parsed.token,
      expiry: typeof parsed.expiry === 'string' ? parsed.expiry : null,
    }
  } catch {
    return null
  }
}

/**
 * The start screen gate. The visitor presses the button, Turnstile solves a
 * challenge, and the resulting token is exchanged for a session token.
 *
 * The markup keeps the classes of the old start screen, and the request
 * handling keeps its failure behaviour: a five second abort, and a fallback to
 * the stored session when the request fails but a token and cached categories
 * already exist.
 */
export default function Unlock({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const pendingRef = useRef(false)
  const isMountedRef = useRef(true)
  const hasNavigatedRef = useRef(false)
  const [status, setStatus] = useState<Status>('idle')
  const [hasAlbinFallen, setHasAlbinFallen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const submit = useCallback(
    async (token: string) => {
      tokenRef.current = null
      pendingRef.current = false
      hasNavigatedRef.current = false
      setStatus('submitting')

      // Read the stored session and cache before the request, so a failure can
      // fall back to them.
      const storedAuth = getStoredAuth()
      const cachedCategories = getCachedCategories()

      const navigateWithCachedData = () => {
        if (hasNavigatedRef.current || !storedAuth?.token || !cachedCategories) {
          return false
        }

        hasNavigatedRef.current = true
        router.push('/categories')
        return true
      }

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      const timeoutId = controller
        ? window.setTimeout(() => {
            controller.abort()
          }, LOGIN_TIMEOUT_MS)
        : null

      try {
        const response = await fetch('/api/session', {
          body: JSON.stringify({ 'cf-turnstile-response': token }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          ...(controller ? { signal: controller.signal } : {}),
        })

        if (!response.ok) {
          throw new Error('Login failed')
        }

        const data = (await response.json()) as { token?: string; expiry?: string }
        const expiry = data.expiry
          ? new Date(data.expiry).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString()

        if (data.token) {
          const auth = { token: data.token, expiry }
          window.localStorage.setItem('auth', JSON.stringify(auth))
        }

        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true
          router.push('/categories')
        }

        if (typeof navigator !== 'undefined' && navigator.onLine) {
          clearCategoryCache()
        }

        try {
          await fetchCategories(data.token)
        } catch (prefetchError) {
          console.warn('Prefetching categories failed:', prefetchError)
        }

        if (isMountedRef.current) {
          setStatus('unlocked')
        }
      } catch (error) {
        console.error('Login error:', error)
        navigateWithCachedData()
        if (isMountedRef.current) {
          setStatus('failed')
        }
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId)
        }
      }
    },
    [router],
  )

  useEffect(() => {
    let cancelled = false

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current || widgetIdRef.current) {
          return
        }

        widgetIdRef.current = turnstile.render(containerRef.current, {
          action: ACTION,
          callback: (token: string) => {
            tokenRef.current = token
            if (pendingRef.current) {
              void submit(token)
            }
          },
          'error-callback': () => setStatus('failed'),
          sitekey: siteKey,
          theme: 'dark',
        })
      })
      .catch(() => setStatus('failed'))

    return () => {
      cancelled = true
    }
  }, [siteKey, submit])

  const handleClick = () => {
    if (status === 'unlocked' || status === 'submitting' || status === 'solving') {
      return
    }

    if (status === 'failed') {
      // Turnstile response tokens are single use, so a retry needs a fresh one.
      tokenRef.current = null
      if (widgetIdRef.current) {
        window.turnstile?.reset(widgetIdRef.current)
      }
      setStatus('idle')
      return
    }

    if (tokenRef.current) {
      void submit(tokenRef.current)
      return
    }

    // The challenge is still solving; submit as soon as its callback fires.
    pendingRef.current = true
    setStatus('solving')
  }

  const label =
    status === 'submitting' || status === 'solving'
      ? LABELS[status]
      : hasAlbinFallen || status === 'failed'
        ? LABELS.failed
        : LABELS.idle

  return (
    <div className={hasAlbinFallen ? 'start-container start-container--fallen' : 'start-container'}>
      <Albin onFall={() => setHasAlbinFallen(true)} />
      <button
        disabled={status === 'submitting' || status === 'unlocked'}
        onClick={handleClick}
        type="button"
      >
        {label}
      </button>
      <p className="sr-only" role="status">
        {status === 'unlocked'
          ? 'Upplåst.'
          : status === 'failed'
            ? 'Inlåsningen misslyckades. Försök igen.'
            : status === 'idle'
              ? ''
              : 'Kontrollerar.'}
      </p>
      <div className="turnstile-slot" ref={containerRef} />
    </div>
  )
}
