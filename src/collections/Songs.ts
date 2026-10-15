import type { CollectionConfig } from 'payload'

import { authenticated, editorOrAdmin } from '../access'

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
}
