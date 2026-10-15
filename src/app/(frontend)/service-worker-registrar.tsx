'use client'

import { useEffect } from 'react'

/**
 * Registers the offline service worker.
 *
 * The old client registered it behind `import.meta.env.PROD`, so this does the
 * same by checking NODE_ENV. The `load` event has usually already fired by the
 * time a React effect runs, so register immediately in that case.
 */
export default function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return
    }

    const register = () => {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.error('Service worker registration failed', error)
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
