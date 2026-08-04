import { beforeEach, describe, expect, it, vi } from 'vitest'

const TENANT = '00000000-0000-4000-8000-000000000001'

let counts: Record<string, number> = {}
const deletedFrom: Array<string> = []

/** Minimal thenable query builder — see push-send.test.ts for the original. */
function builder(table: string) {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: null,
        error: null,
        count: counts[table] ?? 0,
      }).then(resolve),
  }
  for (const method of ['select', 'eq']) {
    chain[method] = () => chain
  }
  chain.delete = () => {
    deletedFrom.push(table)
    return chain
  }
  return chain
}

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({ from: (table: string) => builder(table) }),
}))

vi.mock('./admin-users', () => ({
  requireSuperadmin: () => Promise.resolve({ id: 'u1', role: 'superadmin' }),
}))

vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))

const { deleteTenantFn } = await import('./admin-tenants')

describe('deleteTenantFn', () => {
  beforeEach(() => {
    counts = {}
    deletedFrom.length = 0
  })

  it('refuses a tenant that still has users or houses, naming both', async () => {
    counts = { profiles: 12, houses: 8 }

    await expect(
      deleteTenantFn({ data: { tenantId: TENANT } }),
    ).rejects.toThrow('12 usuarios y 8 casas')

    expect(deletedFrom).toEqual([])
  })

  it('refuses a tenant that only has payments', async () => {
    counts = { payments: 3 }

    await expect(
      deleteTenantFn({ data: { tenantId: TENANT } }),
    ).rejects.toThrow('3 pagos')
  })

  it('deletes an empty tenant', async () => {
    await deleteTenantFn({ data: { tenantId: TENANT } })

    expect(deletedFrom).toEqual(['tenants'])
  })
})
