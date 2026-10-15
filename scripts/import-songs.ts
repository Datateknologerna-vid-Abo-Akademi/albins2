/**
 * Imports the songbook corpus into D1.
 *
 * This is a local and CI script only: it runs through the Payload CLI
 * (`pnpm import:songs`) and must never be imported by the Worker.
 *
 * It is idempotent. Songbooks are keyed on name, categories on (songbook,
 * name) and songs on (title, category), so a second run updates instead of
 * duplicating.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { htmlToLexical, type LexicalEditorState } from '../src/lib/html-to-lexical'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_EXPORT_PATH = path.resolve(
  dirname,
  '..',
  '.migration',
  'songs-export.json',
)

type CorpusCategory = {
  name: string
  order: number
}

type CorpusSong = {
  title: string
  melody: string
  author: string
  content: string
  page_number: number | null
  negative_page_number: number | null
  song_order: number
  category: string
  category_order: number
}

type Corpus = {
  songbook: string
  counts: { songs: number; categories: number }
  categories: CorpusCategory[]
  songs: CorpusSong[]
}

type Tally = {
  created: number
  updated: number
  unchanged: number
}

const emptyTally = (): Tally => ({ created: 0, unchanged: 0, updated: 0 })

/** Compares two values with object keys sorted, so key order never matters. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null'
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))

  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
}

function toRelationshipId(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'object') {
    return (value as { id?: number }).id ?? null
  }

  return typeof value === 'number' ? value : null
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

/** An empty text field and a missing one are the same thing. */
function toText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Canonical form of the fields the import owns, applied to both the stored
 * document and the incoming data so a rerun reports what actually changed.
 */
function songSignature(song: {
  author?: string | null
  category?: unknown
  content?: unknown
  melody?: string | null
  negativePageNumber?: number | null
  order?: number | null
  pageNumber?: number | null
}): string {
  return stableStringify({
    author: toText(song.author),
    category: toRelationshipId(song.category),
    content: song.content ?? null,
    melody: toText(song.melody),
    negativePageNumber: toNumber(song.negativePageNumber),
    order: toNumber(song.order),
    pageNumber: toNumber(song.pageNumber),
  })
}

async function main() {
  const exportPath = process.env.SONGS_EXPORT_PATH ?? DEFAULT_EXPORT_PATH
  const corpus = JSON.parse(await readFile(exportPath, 'utf8')) as Corpus

  console.log(`Reading ${exportPath}`)
  console.log(
    `Export declares ${corpus.counts.songs} songs in ${corpus.counts.categories} categories.`,
  )

  const payload = await getPayload({ config })

  // Songbook -----------------------------------------------------------------
  const songbookResult = await payload.find({
    collection: 'songbooks',
    depth: 0,
    limit: 1,
    pagination: false,
    where: { name: { equals: corpus.songbook } },
  })

  const songbook = songbookResult.docs[0]
    ? songbookResult.docs[0]
    : await payload.create({ collection: 'songbooks', data: { name: corpus.songbook } })

  console.log(
    `Songbook "${songbook.name}": ${songbookResult.docs[0] ? 'existing' : 'created'}`,
  )

  // Categories ---------------------------------------------------------------
  const categories = emptyTally()
  const categoryIdByName = new Map<string, number>()
  const existingCategories = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 0,
    pagination: false,
    where: { songbook: { equals: songbook.id } },
  })
  const existingCategoryByName = new Map(
    existingCategories.docs.map((category) => [category.name, category]),
  )

  for (const category of [...corpus.categories].sort((left, right) => left.order - right.order)) {
    const existing = existingCategoryByName.get(category.name)

    if (!existing) {
      const created = await payload.create({
        collection: 'categories',
        data: { name: category.name, order: category.order, songbook: songbook.id },
      })
      categoryIdByName.set(category.name, created.id)
      categories.created += 1
      continue
    }

    categoryIdByName.set(category.name, existing.id)

    if (stableStringify(existing.order) === stableStringify(category.order)) {
      categories.unchanged += 1
      continue
    }

    await payload.update({
      collection: 'categories',
      data: { order: category.order },
      id: existing.id,
    })
    categories.updated += 1
  }

  // Songs --------------------------------------------------------------------
  const songs = emptyTally()
  const categoryIds = [...categoryIdByName.values()]

  const existingSongsByKey = new Map<string, { id: number }>()
  if (categoryIds.length > 0) {
    const existingSongs = await payload.find({
      collection: 'songs',
      depth: 0,
      limit: 0,
      pagination: false,
      where: { category: { in: categoryIds } },
    })

    for (const song of existingSongs.docs) {
      const categoryId = toRelationshipId(song.category)
      existingSongsByKey.set(`${categoryId}::${song.title}`, { id: song.id })
    }
  }

  for (const song of corpus.songs) {
    const categoryId = categoryIdByName.get(song.category)
    if (categoryId === undefined) {
      throw new Error(`Song "${song.title}" refers to unknown category "${song.category}".`)
    }

    const content: LexicalEditorState = htmlToLexical(song.content)
    const data = {
      author: song.author,
      category: categoryId,
      content,
      melody: song.melody,
      negativePageNumber: song.negative_page_number,
      order: song.song_order,
      pageNumber: song.page_number,
      title: song.title,
    }

    const existing = existingSongsByKey.get(`${categoryId}::${song.title}`)

    if (!existing) {
      await payload.create({ collection: 'songs', data })
      songs.created += 1
      continue
    }

    const current = await payload.findByID({
      collection: 'songs',
      depth: 0,
      id: existing.id,
    })

    const unchanged = songSignature(current) === songSignature(data)

    if (unchanged) {
      songs.unchanged += 1
      continue
    }

    await payload.update({ collection: 'songs', data, id: existing.id })
    songs.updated += 1
  }

  console.log(
    `Categories: created ${categories.created}, updated ${categories.updated}, unchanged ${categories.unchanged}`,
  )
  console.log(`Songs: created ${songs.created}, updated ${songs.updated}, unchanged ${songs.unchanged}`)

  const total = await payload.find({ collection: 'songs', depth: 0, limit: 0, pagination: false })
  console.log(`Database now holds ${total.totalDocs} songs.`)
}

await main()
process.exit(0)
