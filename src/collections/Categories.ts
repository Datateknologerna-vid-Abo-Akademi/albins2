import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import { authenticated, editorOrAdmin } from '../access'

/**
 * Payload has no field level composite unique constraint, so the (songbook,
 * name) pair is checked here as well as by the unique index below.
 */
const uniqueNamePerSongbook: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) {
    return data
  }

  const name = data.name ?? originalDoc?.name
  const relationship = data.songbook ?? originalDoc?.songbook
  const songbookId = typeof relationship === 'object' ? relationship?.id : relationship
  const ownId = originalDoc?.id

  if (!name || !songbookId) {
    return data
  }

  const existing = await req.payload.find({
    collection: 'categories',
    where: {
      and: [
        { name: { equals: name } },
        { songbook: { equals: songbookId } },
        ...(ownId ? [{ id: { not_equals: ownId } }] : []),
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    req,
  })

  if (existing.docs.length > 0) {
    throw new ValidationError({
      errors: [
        {
          message: `A category named "${name}" already exists in this songbook.`,
          path: 'name',
        },
      ],
    })
  }

  return data
}

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'order', 'songbook', 'updatedAt'],
  },
  access: {
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
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        description: 'Sort order within the songbook. Use increments of 10.',
      },
    },
    {
      name: 'songbook',
      type: 'relationship',
      relationTo: 'songbooks',
      required: true,
    },
  ],
  indexes: [
    {
      fields: ['songbook', 'name'],
      unique: true,
    },
  ],
  hooks: {
    beforeValidate: [uniqueNamePerSongbook],
  },
  versions: false,
}
