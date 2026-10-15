import type { Metadata } from 'next'
import React from 'react'

import './styles.css'

export const metadata: Metadata = {
  description: 'Albins digitala sångbok',
  title: 'Albins',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
