import { describe, expect, it } from 'vitest'
import {
  assertAdmin,
  assertTenantAccess,
  canAccessTenant,
  canGuardAccess,
} from './auth'

const HOME = '11111111-1111-1111-1111-111111111111'
const EXTRA = '22222222-2222-2222-2222-222222222222'
const OTHER = '33333333-3333-3333-3333-333333333333'

describe('assertTenantAccess', () => {
  it('allows the home tenant', () => {
    const user = { role: 'user', tenantIds: [HOME] }
    expect(() => assertTenantAccess(user, HOME)).not.toThrow()
  })

  it('allows a tenant granted through tenant_admins', () => {
    const admin = { role: 'admin', tenantIds: [HOME, EXTRA] }
    expect(() => assertTenantAccess(admin, EXTRA)).not.toThrow()
  })

  it('allows a superadmin into a tenant they have no membership in', () => {
    const superadmin = { role: 'superadmin', tenantIds: [HOME] }
    expect(() => assertTenantAccess(superadmin, OTHER)).not.toThrow()
  })

  it('rejects a tenant the user has no membership in', () => {
    const admin = { role: 'admin', tenantIds: [HOME, EXTRA] }
    expect(() => assertTenantAccess(admin, OTHER)).toThrow('Unauthorized')
    expect(canAccessTenant(admin, OTHER)).toBe(false)
  })
})

describe('assertAdmin', () => {
  it.each(['admin', 'superadmin'])('allows %s', (role) => {
    expect(() => assertAdmin({ role, tenantIds: [] })).not.toThrow()
  })

  it('rejects a resident', () => {
    expect(() => assertAdmin({ role: 'user', tenantIds: [] })).toThrow(
      'Unauthorized',
    )
  })

  it('rejects a guard', () => {
    expect(() => assertAdmin({ role: 'guard', tenantIds: [] })).toThrow(
      'Unauthorized',
    )
  })
})

describe('canGuardAccess', () => {
  it.each(['/lomas/anuncios', '/lomas/perfil'])('allows %s', (path) => {
    expect(canGuardAccess(path, 'lomas')).toBe(true)
  })

  it.each([
    '/lomas/', // dashboard
    '/lomas/casa',
    '/lomas/pagos',
    '/lomas/documentos',
    '/lomas/admin-anuncios',
    '/otro/anuncios', // right section, wrong tenant
  ])('rejects %s', (path) => {
    expect(canGuardAccess(path, 'lomas')).toBe(false)
  })
})
