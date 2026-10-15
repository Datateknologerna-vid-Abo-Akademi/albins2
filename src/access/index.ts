import type { AccessArgs, FieldAccessArgs } from 'payload'

function hasRole(user: unknown, role: string): boolean {
  const roles = (user as { roles?: string[] } | null | undefined)?.roles
  return Array.isArray(roles) && roles.includes(role)
}

/** Any user logged in to the admin panel. */
export const authenticated = ({ req: { user } }: AccessArgs): boolean => Boolean(user)

/** Admins only. Used where a mistake can lock people out or widen access. */
export const adminOnly = ({ req: { user } }: AccessArgs): boolean => hasRole(user, 'admin')

/** Admins and editors. Used for ordinary content writes. */
export const editorOrAdmin = ({ req: { user } }: AccessArgs): boolean =>
  hasRole(user, 'admin') || hasRole(user, 'editor')

/** Field level variant for fields only an admin may change. */
export const adminOnlyField = ({ req: { user } }: FieldAccessArgs): boolean => hasRole(user, 'admin')
