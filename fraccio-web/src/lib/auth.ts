import { logger } from '@/utils/logger'

/**
 * The subset of `getUser()`'s return value that authorization depends on.
 * `tenantIds` is the home tenant (`profiles.tenant_id`) plus any `tenant_admins` rows.
 */
export interface SessionUser {
  role: string
  tenantIds: Array<string>
  email?: string | undefined
}

export function isAdmin(user: Pick<SessionUser, 'role'>) {
  return user.role === 'admin' || user.role === 'superadmin'
}

export function canAccessTenant(user: SessionUser, tenantId: string) {
  return user.role === 'superadmin' || user.tenantIds.includes(tenantId)
}

/** Throws `Unauthorized` unless the user belongs to (or superadmins over) the tenant. */
export function assertTenantAccess(user: SessionUser, tenantId: string) {
  if (canAccessTenant(user, tenantId)) return
  logger('error', 'User does not belong to tenant', {
    userId: user.email,
    requestedTenant: tenantId,
  })
  throw new Error('Unauthorized')
}

/** Throws `Unauthorized` unless the user is an admin or superadmin. */
export function assertAdmin(user: SessionUser, action = 'perform this action') {
  if (isAdmin(user)) return
  logger('error', `User is not authorized to ${action}`, {
    userId: user.email,
    role: user.role,
  })
  throw new Error('Unauthorized: Admin access required')
}
