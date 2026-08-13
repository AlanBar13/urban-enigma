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

/**
 * Path suffixes (under `/$tenantId`) a `guard` may reach. Widen this list to
 * open up more sections to guards — the tenant layout's route guard and its nav
 * filter both read it.
 *
 * ponytail: hidden nav + the layout redirect are the whole enforcement layer,
 * same posture as the feature flags. A guard can still call e.g.
 * `getPaymentHistoryFn` directly (it only asserts tenant access). Add per-fn
 * checks if guards ever handle data residents shouldn't reach.
 */
const GUARD_SECTIONS = ['/anuncios', '/perfil', '/admin-visitas']

export function isGuard(user: Pick<SessionUser, 'role'>) {
  return user.role === 'guard'
}

/** Whether a guard may reach `pathname` inside the tenant at `tenantPath`. */
export function canGuardAccess(pathname: string, tenantPath: string) {
  return GUARD_SECTIONS.some((section) =>
    pathname.startsWith(`/${tenantPath}${section}`),
  )
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
