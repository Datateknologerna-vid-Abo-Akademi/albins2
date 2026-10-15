// Default OpenNext Cloudflare config. No incremental cache or tag cache is
// configured yet, so every request is served from the Worker.
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

export default defineCloudflareConfig({})
