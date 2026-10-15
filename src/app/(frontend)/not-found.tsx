'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * The old client rendered <Navigate to="/" /> for every unmatched path. A
 * client redirect keeps that behaviour, including for a direct request.
 */
export default function NotFound(): null {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}
