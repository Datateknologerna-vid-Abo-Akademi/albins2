import Unlock from './unlock'

// The Turnstile site key is runtime configuration, so this page is not cached.
export const dynamic = 'force-dynamic'

// Public, and already visible in the rendered HTML. Overridden by
// TURNSTILE_SITE_KEY, which local development points at the test key.
const DEFAULT_SITE_KEY = '0x4AAAAAAFXzEiqLnNlrl6Y1'

export default function HomePage() {
  const siteKey = process.env.TURNSTILE_SITE_KEY ?? DEFAULT_SITE_KEY

  return (
    <main>
      <h1>Albins</h1>
      <Unlock siteKey={siteKey} />
      <p>
        Backend for the digital songbook. The songbook itself is served by the gated
        <code> /api/songbook</code> route.
      </p>
      <p>
        Content is managed in the <a href="/admin">admin panel</a>.
      </p>
    </main>
  )
}
