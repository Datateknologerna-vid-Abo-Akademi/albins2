import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField, authenticated } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // Payload still allows creating the very first user when the collection is
    // empty, which is how the first admin is bootstrapped. That flow is not
    // gated by this rule, so `beforeChange` below forces its outcome.
    create: adminOnly,
    read: authenticated,
    update: authenticated,
    delete: adminOnly,
    admin: authenticated,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') {
          return data
        }

        // The first account is created through an unauthenticated flow that
        // access control does not gate, and the form defaults the role to
        // `editor`. An editor can neither create users nor change roles, so
        // that default would lock administration out permanently. Force the
        // first account to be an admin whatever the request asked for.
        const existing = await req.payload.count({ collection: 'users' })
        if (existing.totalDocs === 0) {
          return { ...data, roles: ['admin'] }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['editor'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      // Roles travel in the JWT so access checks do not need a database read.
      saveToJWT: true,
      // An editor must not be able to promote itself.
      access: {
        update: adminOnlyField,
      },
    },
  ],
  versions: false,
}
