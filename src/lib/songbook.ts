/**
 * The public songbook read path.
 *
 * The response shape below is the contract the client was built against, and
 * the collection definitions in src/collections are what write these columns.
 * It lives here rather than in the route so the Next.js route and the small api
 * Worker build the exact same bytes: the reference response in the migration
 * notes is compared against what this produces.
 */

export type SongbookSong = {
  audio: null
  author: string | null
  category: number
  category_name: string
  content: string | null
  id: number
  melody: string | null
  negative_page_number: number | null
  order: number | null
  page_number: number | null
  title: string
}

export type SongbookCategory = {
  id: number
  name: string
  order: number | null
  songs: SongbookSong[]
}

export type Songbook = {
  id: number
  name: string
  categories: SongbookCategory[]
}

/**
 * A successful read, or the HTTP status and detail the caller answers with.
 * The discriminant is a string rather than a boolean because `strictNullChecks`
 * is off in this project, and boolean discriminants do not narrow through an
 * `await` in that mode.
 */
export type SongbookRead =
  | { kind: 'songbook'; songbook: Songbook }
  | { kind: 'error'; status: 404 | 409; detail: string }

/** D1 hands back SQLite numerics, which can arrive as strings or null. */
function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

type SongbookRow = { id: number; name: string }
type CategoryRow = { id: number; name: string; order: unknown }
type SongRow = {
  id: number
  title: string
  melody: string | null
  author: string | null
  content_html: string | null
  page_number: unknown
  negative_page_number: unknown
  order: unknown
  category_id: number
}

/**
 * Reads the songbook straight from D1, rather than through the Payload Local
 * API. Payload's initialisation is the largest cost on a cold isolate, and this
 * is the one public read path, so it is worth going straight to the tables.
 * `content_html` is rendered when a song is written, so nothing here loads the
 * Lexical HTML converter.
 */
export async function readSongbook(db: D1Database): Promise<SongbookRead> {
  const songbooks = await db
    .prepare('select id, name from songbooks order by id asc limit 2')
    .all<SongbookRow>()

  const bookRows = songbooks.results ?? []
  if (bookRows.length === 0) {
    return { detail: 'Songbook not found.', kind: 'error', status: 404 }
  }
  if (bookRows.length > 1) {
    return {
      detail: 'Multiple songbooks found. Please ensure only one songbook exists.',
      kind: 'error',
      status: 409,
    }
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
        'select id, title, melody, author, content_html, page_number, negative_page_number, "order", category_id from songs where category_id in (select id from categories where songbook_id = ?1) order by "order" asc, id asc',
      )
      .bind(songbook.id)
      .all<SongRow>(),
  ])

  const categoryRows = categories.results ?? []
  const nameById = new Map(categoryRows.map((category) => [category.id, category.name]))
  const songsByCategory = new Map<number, SongbookSong[]>()

  for (const song of songs.results ?? []) {
    const bucket = songsByCategory.get(song.category_id) ?? []
    bucket.push({
      audio: null,
      author: song.author ?? null,
      category: song.category_id,
      category_name: nameById.get(song.category_id) ?? '',
      content: song.content_html ?? null,
      id: song.id,
      melody: song.melody ?? null,
      negative_page_number: toNullableNumber(song.negative_page_number),
      order: toNullableNumber(song.order),
      page_number: toNullableNumber(song.page_number),
      title: song.title,
    })
    songsByCategory.set(song.category_id, bucket)
  }

  return {
    kind: 'songbook',
    songbook: {
      id: songbook.id,
      name: songbook.name,
      categories: categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        order: toNullableNumber(category.order),
        songs: songsByCategory.get(category.id) ?? [],
      })),
    },
  }
}
