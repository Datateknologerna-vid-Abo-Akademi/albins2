import type { CollectionConfig } from 'payload'

import { authenticated, editorOrAdmin } from '../access'

export const Songbooks: CollectionConfig = {
  slug: 'songbooks',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // The public songbook is served by the gated /api/songbook route, never by
    // Payload's own REST or GraphQL API.
    read: authenticated,
    create: editorOrAdmin,
    update: editorOrAdmin,
    delete: editorOrAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
  ],
  versions: false,
}
