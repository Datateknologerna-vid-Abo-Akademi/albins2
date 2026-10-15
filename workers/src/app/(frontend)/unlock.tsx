'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script'
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Must match EXPECTED_TURNSTILE_ACTION in src/app/api/session/route.ts.
const ACTION = 'session'

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

/**
 * The start screen gate. The visitor presses the button, Turnstile solves a
 * challenge, and the resulting token is exchanged for a session token.
 */
export default function Unlock({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const pendingRef = useRef(false)
  const [status, setStatus] = useState<Status>('idle')

  const submit = useCallback(async (token: string) => {
    tokenRef.current = null
    pendingRef.current = false
    setStatus('submitting')

    try {
      const response = await fetch('/api/session', {
        body: JSON.stringify({ 'cf-turnstile-response': token }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        setStatus('failed')
        return
      }

      const data = (await response.json()) as { token?: string; expiry?: string }
      if (data.token) {
        window.localStorage.setItem(
          'auth',
          JSON.stringify({ expiry: data.expiry, token: data.token }),
        )
      }
      setStatus('unlocked')
    } catch {
      setStatus('failed')
    }
  }, [])

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

  return (
    <div>
      <button
        disabled={status === 'submitting' || status === 'unlocked'}
        onClick={handleClick}
        type="button"
      >
        {LABELS[status]}
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
      <div ref={containerRef} />
    </div>
  )
}
