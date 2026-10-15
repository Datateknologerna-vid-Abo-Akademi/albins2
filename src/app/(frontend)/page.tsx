import Unlock from './unlock'

// The Turnstile site key is runtime configuration, so this page is not cached.
export const dynamic = 'force-dynamic'

// Public, and already visible in the rendered HTML. Overridden by
// TURNSTILE_SITE_KEY.
const DEFAULT_SITE_KEY = '0x4AAAAAAFXzEiqLnNlrl6Y1'

export default function HomePage() {
  const siteKey = process.env.TURNSTILE_SITE_KEY ?? DEFAULT_SITE_KEY

  return <Unlock siteKey={siteKey} />
}
