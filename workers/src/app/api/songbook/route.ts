import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import config from '@payload-config'
import { readSessionToken, verifySessionToken } from '@/lib/session'

// Never statically generated and never cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' } as const

const unauthorized = (detail: string) =>
  NextResponse.json({ detail }, { headers: NO_STORE, status: 401 })

const toNullableNumber = (value: number | null | undefined): number | null =>
  typeof value === 'number' ? value : null

type LexicalState = Parameters<typeof convertLexicalToHTML>[0]['data']

/**
 * Payload's HTML converter escapes single and double quotes as entities. The
 * client searches the raw HTML string rather than the rendered text, so quotes
 * are kept literal, the way CKEditor stored them.
 */
function toSongbookHtml(data: LexicalState): string {
  return convertLexicalToHTML({ data, disableContainer: true })
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
}

export async function GET(request: Request) {
  const sessionSecret = process.env.SESSION_SIGNING_SECRET
  if (!sessionSecret) {
    console.error('[api/songbook] SESSION_SIGNING_SECRET is not set, refusing to serve the songbook.')
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

  const payload = await getPayload({ config })

  // The gate is the signed session token above, so the Local API reads run
  // with overrideAccess (the default). Payload's own REST and GraphQL read
  // access stays restricted to authenticated admin users.
  const songbooks = await payload.find({
    collection: 'songbooks',
    depth: 0,
    limit: 2,
    pagination: false,
    sort: 'id',
  })

  if (songbooks.totalDocs === 0) {
    return NextResponse.json(
      { detail: 'Songbook not found.' },
      { headers: NO_STORE, status: 404 },
    )
  }

  if (songbooks.totalDocs > 1) {
    return NextResponse.json(
      { detail: 'Multiple songbooks found. Please ensure only one songbook exists.' },
      { headers: NO_STORE, status: 409 },
    )
  }

  const songbook = songbooks.docs[0]

  const categories = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 0,
    pagination: false,
    sort: ['order', 'id'],
    where: { songbook: { equals: songbook.id } },
  })

  const songsByCategory = new Map<number, CategorySong[]>()
  const categoryIds = categories.docs.map((category) => category.id)

  if (categoryIds.length > 0) {
    const songs = await payload.find({
      collection: 'songs',
      depth: 0,
      limit: 0,
      pagination: false,
      sort: ['order', 'id'],
      where: { category: { in: categoryIds } },
    })

    for (const song of songs.docs) {
      const categoryId = toRelationshipId(song.category)
      if (categoryId === null) {
        continue
      }

      const bucket = songsByCategory.get(categoryId) ?? []
      bucket.push({
        audio: null,
        author: song.author ?? null,
        category: categoryId,
        category_name: nameOf(categories.docs, categoryId),
        content: song.content ? toSongbookHtml(song.content) : null,
        id: song.id,
        melody: song.melody ?? null,
        negative_page_number: toNullableNumber(song.negativePageNumber),
        order: toNullableNumber(song.order),
        page_number: toNullableNumber(song.pageNumber),
        title: song.title,
      })
      songsByCategory.set(categoryId, bucket)
    }
  }

  return NextResponse.json(
    {
      id: songbook.id,
      name: songbook.name,
      categories: categories.docs.map((category) => ({
        id: category.id,
        name: category.name,
        order: toNullableNumber(category.order),
        songs: songsByCategory.get(category.id) ?? [],
      })),
    },
    { headers: NO_STORE },
  )
}

type CategorySong = {
  id: number
  category_name: string
  title: string
  melody: string | null
  author: string | null
  content: string | null
  audio: null
  category: number
  page_number: number | null
  negative_page_number: number | null
  order: number | null
}

type RelationshipValue = number | { id: number } | null | undefined

function toRelationshipId(value: RelationshipValue): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'object') {
    return value.id ?? null
  }

  return value
}

function nameOf(categories: { id: number; name: string }[], id: number | null): string {
  return categories.find((category) => category.id === id)?.name ?? ''
}
