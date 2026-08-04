import { beforeEach, describe, expect, it, vi } from 'vitest'

let payment: unknown = null
const deletedFrom: Array<string> = []

/** Minimal thenable query builder — see push-send.test.ts for the original. */
function builder(table: string, result: unknown) {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
  }
  for (const method of ['select', 'eq', 'limit', 'insert', 'order']) {
    chain[method] = () => chain
  }
  chain.delete = () => {
    deletedFrom.push(table)
    return chain
  }
  return chain
}

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    from: (table: string) =>
      builder(
        table,
        table === 'payments'
          ? { data: payment, error: null }
          : { data: null, error: null },
      ),
  }),
}))

const TENANT = '00000000-0000-4000-8000-000000000001'

vi.mock('./user', () => ({
  getUser: () =>
    Promise.resolve({
      id: 'u1',
      role: 'admin',
      tenantId: '00000000-0000-4000-8000-000000000001',
      tenantIds: ['00000000-0000-4000-8000-000000000001'],
    }),
}))

vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))

const { deleteHouseFn } = await import('./houses')

describe('deleteHouseFn', () => {
  beforeEach(() => {
    payment = null
    deletedFrom.length = 0
  })

  it('refuses when the house has payments', async () => {
    payment = { id: 'p1' }

    await expect(
      deleteHouseFn({
        data: { tenantId: TENANT, houseId: 1 },
      }),
    ).rejects.toThrow('pagos registrados')

    expect(deletedFrom).toEqual([])
  })

  it('deletes dependents before the house itself', async () => {
    await deleteHouseFn({
      data: { tenantId: '00000000-0000-4000-8000-000000000001', houseId: 1 },
    })

    expect(deletedFrom).toEqual([
      'house_users',
      'house_owners',
      'invites',
      'houses',
    ])
  })
})
