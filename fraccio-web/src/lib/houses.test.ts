import { beforeEach, describe, expect, it, vi } from 'vitest'

let payment: unknown = null
let plan = 'arranque'
let houseCount = 0
const deletedFrom: Array<string> = []
const insertedInto: Array<string> = []

/** Minimal thenable query builder — see push-send.test.ts for the original. */
function builder(table: string, result: unknown) {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
  }
  for (const method of ['select', 'eq', 'limit', 'order']) {
    chain[method] = () => chain
  }
  chain.insert = () => {
    insertedInto.push(table)
    return chain
  }
  chain.delete = () => {
    deletedFrom.push(table)
    return chain
  }
  return chain
}

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      const results: Record<string, unknown> = {
        payments: { data: payment, error: null },
        tenants: { data: { plan }, error: null },
        // `count` feeds the plan cap check; `data` feeds the insert's .single()
        houses: { data: { id: 1 }, count: houseCount, error: null },
      }
      return builder(table, results[table] ?? { data: null, error: null })
    },
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

const { createHouseFn, deleteHouseFn } = await import('./houses')

describe('createHouseFn plan cap', () => {
  beforeEach(() => {
    plan = 'arranque'
    houseCount = 0
    insertedInto.length = 0
    deletedFrom.length = 0
  })

  const create = () =>
    createHouseFn({
      data: { tenantId: TENANT, name: 'Casa 1', address: 'Calle Falsa 123' },
    })

  it('allows a house below the plan cap', async () => {
    houseCount = 9 // arranque = 10
    await create()
    expect(insertedInto).toEqual(['houses'])
  })

  it('refuses once the plan cap is reached', async () => {
    houseCount = 10
    await expect(create()).rejects.toThrow('hasta 10 casas')
    expect(insertedInto).toEqual([])
  })

  it('scales the cap with the plan', async () => {
    plan = 'basico'
    houseCount = 10 // would have blocked on arranque
    await create()
    expect(insertedInto).toEqual(['houses'])

    houseCount = 50
    await expect(create()).rejects.toThrow('hasta 50 casas')
  })

  it('still refuses when already over the cap, without touching what exists', async () => {
    // e.g. downgraded after the houses were created — blocks new ones only
    houseCount = 25
    await expect(create()).rejects.toThrow('Sube de plan')
    expect(insertedInto).toEqual([])
    expect(deletedFrom).toEqual([])
  })
})

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
