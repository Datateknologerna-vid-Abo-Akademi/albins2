import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'

import { readSessionToken, verifySessionToken } from '@/lib/session'

// Never statically generated and never cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' } as const

const unauthorized = (detail: string) =>
  NextResponse.json({ detail }, { headers: NO_STORE, status: 401 })

/** D1 hands back SQLite numerics, which can arrive as strings or null. */
function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

type LexicalState = Parameters<typeof convertLexicalToHTML>[0]['data']

/** An empty paragraph, however the HTML converter happens to spell the break. */
const EMPTY_PARAGRAPH = /<p>(?:<br\s*\/?>)+<\/p>/g

/**
 * Payload's HTML converter escapes single and double quotes as entities, and
 * renders an empty paragraph as `<p><br></p>`. The client searches the raw HTML
 * string rather than the rendered text, so quotes are kept literal, the way
 * CKEditor stored them, and a blank line is written back as `<p></p>`, which is
 * the form it had before. The extra `<br>` gives the blank line a marginally
 * different height and shifts the whole page by a pixel.
 */
function toSongbookHtml(data: LexicalState): string {
  return convertLexicalToHTML({ data, disableContainer: true })
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replace(EMPTY_PARAGRAPH, '<p></p>')
}

function contentToHtml(content: unknown): string | null {
  if (typeof content !== 'string' || content.length === 0) {
    return null
  }

  try {
    return toSongbookHtml(JSON.parse(content) as LexicalState)
  } catch (error) {
    // A song whose stored Lexical state cannot be read still has to be
    // servable, and an empty body is better than failing the whole songbook.
    console.error(`[api/songbook] could not render song content: ${String(error)}`)
    return null
  }
}

type SongbookRow = { id: number; name: string }
type CategoryRow = { id: number; name: string; order: unknown }
type SongRow = {
  id: number
  title: string
  melody: string | null
  author: string | null
  content: string | null
  page_number: unknown
  negative_page_number: unknown
  order: unknown
  category_id: number
}

export async function GET(request: Request) {
  const sessionSecret = process.env.SESSION_SIGNING_SECRET
  if (!sessionSecret) {
    console.error(
      '[api/songbook] SESSION_SIGNING_SECRET is not set, refusing to serve the songbook.',
    )
    return NextResponse.json(
      { detail: 'Session signing is not configured.' },
      { headers: NO_STORE, status: 500 },
    )
  }

  const token = readSessionToken(request)
  if (!token) {
    return unauthorized('Authentication credentials were not provided.')
  }

  const session = await verifySessionToken(sessionSecret, token)
  if (!session) {
    return unauthorized('Invalid or expired token.')
  }

  const { env } = await getCloudflareContext({ async: true })
  const db = env.DB

  // Read D1 directly rather than through the Payload Local API. Payload's
  // initialisation is the largest cost on a cold isolate, and this is the one
  // public read path, so it is worth going straight to the tables. The shape
  // below is the contract the client was built against, and the collection
  // definitions in src/collections are what write these columns.
  const songbooks = await db
    .prepare('select id, name from songbooks order by id asc limit 2')
    .all<SongbookRow>()

  const bookRows = songbooks.results ?? []
  if (bookRows.length === 0) {
    return NextResponse.json({ detail: 'Songbook not found.' }, { headers: NO_STORE, status: 404 })
  }
  if (bookRows.length > 1) {
    return NextResponse.json(
      { detail: 'Multiple songbooks found. Please ensure only one songbook exists.' },
      { headers: NO_STORE, status: 409 },
    )
  }

  const songbook = bookRows[0]

  const [categories, songs] = await Promise.all([
    db
      .prepare(
        'select id, name, "order" from categories where songbook_id = ?1 order by "order" asc, id asc',
      )
      .bind(songbook.id)
      .all<CategoryRow>(),
    db
      .prepare(
        'select id, title, melody, author, content, page_number, negative_page_number, "order", category_id from songs where category_id in (select id from categories where songbook_id = ?1) order by "order" asc, id asc',
      )
      .bind(songbook.id)
      .all<SongRow>(),
  ])

  const categoryRows = categories.results ?? []
  const nameById = new Map(categoryRows.map((category) => [category.id, category.name]))
  const songsByCategory = new Map<number, unknown[]>()

  for (const song of songs.results ?? []) {
    const bucket = songsByCategory.get(song.category_id) ?? []
    bucket.push({
      audio: null,
      author: song.author ?? null,
      category: song.category_id,
      category_name: nameById.get(song.category_id) ?? '',
      content: contentToHtml(song.content),
      id: song.id,
      melody: song.melody ?? null,
      negative_page_number: toNullableNumber(song.negative_page_number),
      order: toNullableNumber(song.order),
      page_number: toNullableNumber(song.page_number),
      title: song.title,
    })
    songsByCategory.set(song.category_id, bucket)
  }

  return NextResponse.json(
    {
      id: songbook.id,
      name: songbook.name,
      categories: categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        order: toNullableNumber(category.order),
        songs: songsByCategory.get(category.id) ?? [],
      })),
    },
    { headers: NO_STORE },
  )
}
