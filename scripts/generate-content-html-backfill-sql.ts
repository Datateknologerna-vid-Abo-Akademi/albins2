/**
 * Generates the SQL that backfills `songs.content_html` on a database that
 * already holds songs.
 *
 * Local and one-off tooling. It reads the local D1 database, which
 * `pnpm migrate` and `pnpm import:songs` rebuild, and writes an additive script
 * (one `ALTER TABLE` followed by one `UPDATE` per song) that is applied with
 * `wrangler d1 execute albins --remote --file=...`.
 *
 * Only SQLite text literal escaping is needed: apostrophes are doubled. This
 * matters, because the lyrics are Swedish.
 *
 * Usage: node scripts/generate-content-html-backfill-sql.ts [output.sql]
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(dirname, '..')
const wranglerBin = path.resolve(repoRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

const outputPath =
  process.argv[2] ?? path.resolve(repoRoot, '.migration', 'content-html-backfill.sql')

type SongRow = {
  id: number
  content_html: string | null
}

const COLUMN = 'content_html'

/** The wrangler CLI resolves the local D1 binding by name and prints JSON. */
function readLocalSongs(): SongRow[] {
  const raw = execFileSync(
    process.execPath,
    [
      wranglerBin,
      'd1',
      'execute',
      'albins',
      '--local',
      '--json',
      '--command',
      `select id, ${COLUMN} from songs order by id asc`,
    ],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )

  const parsed = JSON.parse(raw) as { results: SongRow[] }[]
  const results = parsed.flatMap((entry) => entry.results ?? [])

  if (results.length === 0) {
    throw new Error('The local database holds no songs. Run pnpm migrate and pnpm import:songs.')
  }

  return results
}

function toSqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function main(): void {
  const songs = readLocalSongs()
  const statements = [`ALTER TABLE \`songs\` ADD \`${COLUMN}\` text;`]

  for (const song of songs) {
    const value = song.content_html ?? null
    const literal = value === null ? 'NULL' : toSqlText(value)
    statements.push(`UPDATE \`songs\` SET \`${COLUMN}\` = ${literal} WHERE \`id\` = ${song.id};`)
  }

  mkdirSync(path.dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${statements.join('\n')}\n`)

  const withHtml = songs.filter((song) => (song.content_html ?? '').length > 0).length
  console.log(`Songs read from local D1: ${songs.length}`)
  console.log(`Songs with a non-empty ${COLUMN}: ${withHtml}`)
  console.log(`SQL written to ${outputPath}`)
}

main()
