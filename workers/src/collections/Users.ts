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
    // empty, which is how the first admin is bootstrapped.
    create: adminOnly,
    read: authenticated,
    update: authenticated,
    delete: adminOnly,
    admin: authenticated,
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
