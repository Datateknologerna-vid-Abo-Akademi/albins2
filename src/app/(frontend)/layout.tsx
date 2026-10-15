import type { Metadata } from 'next'
import React from 'react'

import './styles.css'
import ServiceWorkerRegistrar from './service-worker-registrar'

export const metadata: Metadata = {
  description: 'Albins digitala sångbok',
  // The old client used /Albin.svg as the icon and titled every page
  // "Albins sångbok".
  icons: { icon: '/Albin.svg' },
  title: 'Albins sångbok',
}

// Line Awesome 1.3.0, loaded from index.html in the old client.
const LINE_AWESOME_HREF =
  'https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css'

// The Inter font is imported by styles/index.css, the way the old index.css
// imported it. Next concatenates every stylesheet into one file per entry and
// the bundler emits that @import last, where a browser ignores it, so the font
// is loaded here as well. Same URL, so the browser fetches it once.
const INTER_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <link href={INTER_FONT_HREF} rel="stylesheet" />
        <link href={LINE_AWESOME_HREF} rel="stylesheet" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
