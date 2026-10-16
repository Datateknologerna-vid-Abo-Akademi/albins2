import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { getCloudflareContext, type CloudflareContext } from '@opennextjs/cloudflare'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import type { GetPlatformProxyOptions } from 'wrangler'

import { Categories } from './collections/Categories'
import { Songbooks } from './collections/Songbooks'
import { Songs } from './collections/Songs'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)
const isCLI = process.argv.some((value) => realpath(value)?.endsWith(path.join('payload', 'bin.js')))
const isProduction = process.env.NODE_ENV === 'production'
// `next build` (also when it is driven by the OpenNext build) runs with
// NODE_ENV=production but outside workerd, so it needs the wrangler platform
// proxy instead of the request scoped Cloudflare context.
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

/**
 * Payload's default logger is pino, which writes through Node.js APIs that
 * workerd does not implement. Route logs through console instead.
 */
const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as never

const cloudflare: CloudflareContext =
  isCLI || isBuild || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Songbooks, Categories, Songs],
  editor: lexicalEditor(),
  // Nothing consumes GraphQL and the admin panel uses Payload's REST routes.
  // Leaving it on bundled a schema builder into the Worker for no benefit, and
  // the boot cost is what the first request after an idle period pays.
  graphQL: {
    disable: true,
  },
  secret: process.env.PAYLOAD_SECRET ?? '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({ binding: cloudflare.env.DB }),
  logger: isProduction ? cloudflareLogger : undefined,
})

/**
 * Local development, the Payload CLI and the build run outside a Worker, so
 * they read the D1 binding from wrangler's local platform proxy instead of the
 * request scoped Cloudflare context.
 */
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        // Deploys apply migrations against the remote database, every other
        // invocation stays local.
        remoteBindings: isProduction && !isBuild,
      } satisfies GetPlatformProxyOptions),
  )
}
