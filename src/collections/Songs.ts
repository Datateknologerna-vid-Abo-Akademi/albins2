import type { CollectionConfig } from 'payload'

import { authenticated, editorOrAdmin } from '../access'
import { toSongbookHtml, type LexicalState } from '../lib/songbook-html'

export const Songs: CollectionConfig = {
  slug: 'songs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'pageNumber', 'order', 'updatedAt'],
  },
  access: {
    // Public song access goes through the gated /api/songbook route. Payload's
    // own REST and GraphQL APIs must not expose the corpus.
    read: authenticated,
    create: editorOrAdmin,
    update: editorOrAdmin,
    delete: editorOrAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'melody',
      type: 'text',
    },
    {
      name: 'author',
      type: 'text',
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'contentHtml',
      type: 'text',
      admin: {
        description:
          'Rendered HTML of the lyrics, served verbatim by /api/songbook. Derived on save.',
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'pageNumber',
      type: 'number',
      admin: {
        description: 'Printed page in the songbook.',
      },
    },
    {
      name: 'negativePageNumber',
      type: 'number',
      admin: {
        description: 'Page number of the flipped (turned) page, stored negative.',
      },
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        description: 'Sort order within the category. Use increments of 10.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
    },
  ],
  versions: false,
  hooks: {
    beforeChange: [
      ({ data }) => {
        // `contentHtml` is derived, never edited by hand. A partial update that
        // does not touch the lyrics leaves `content` undefined, and the stored
        // HTML has to survive it, so only a write that carries lyrics recomputes
        // the field.
        if (data.content !== undefined) {
          data.contentHtml = data.content ? toSongbookHtml(data.content as LexicalState) : null
        }
        return data
      },
    ],
  },
}
