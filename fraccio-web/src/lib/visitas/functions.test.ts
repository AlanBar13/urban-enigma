import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as AuthModule from '../auth'

const VISIT_ID = '22222222-2222-4222-8222-222222222222'
const TENANT_ID = '33333333-3333-4333-8333-333333333333'

const filters: Array<[string, string, unknown]> = []
let updated: Record<string, unknown> | null = null

const session = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'a@b.com', role: 'guard', tenantIds: ['t1'] },
  houseId: 99 as number | null,
}))

/** Minimal thenable query builder — see invites/functions.test.ts. */
function builder() {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  }
  chain.select = () => chain
  chain.update = (values: Record<string, unknown>) => {
    updated = values
    return chain
  }
  chain.single = () =>
    Promise.resolve({
      data: {
        id: VISIT_ID,
        tenant_id: TENANT_ID,
        house_id: 7,
        visitor_name: 'Juan',
        checked_in_at: null,
      },
      error: null,
    })
  chain.eq = (column: string, value: unknown) => {
    filters.push(['eq', column, value])
    return chain
  }
  chain.order = () => chain
  return chain
}

vi.mock('../supabase', () => ({ getSupabaseClient: () => ({ from: builder }) }))
vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))
vi.mock('../auth', async () => {
  const actual = await vi.importActual<typeof AuthModule>('../auth')
  return { ...actual, assertTenantAccess: vi.fn() }
})
vi.mock('../user', () => ({ getUser: () => Promise.resolve(session.user) }))
vi.mock('../casa', () => ({
  getUserHouse: () =>
    Promise.resolve({ houseId: session.houseId, isOwner: false }),
}))
const queries = vi.hoisted(() => {
  const rows = () => vi.fn(() => Promise.resolve({ data: [], error: null }))
  return {
    getTenantVisitsQuery: rows(),
    getHouseVisitsQuery: rows(),
    getTenantPreferredQuery: rows(),
    getHousePreferredQuery: rows(),
  }
})
vi.mock('./queries', () => queries)

const { checkInVisitFn, getVisitsFn } = await import('./functions')

beforeEach(() => {
  filters.length = 0
  updated = null
  Object.values(queries).forEach((q) => q.mockClear())
  session.user = {
    id: 'user-1',
    email: 'a@b.com',
    role: 'guard',
    tenantIds: ['t1'],
  }
  session.houseId = 99
})

// Server fns resolve to undefined outside the SSR runtime, so these assert
// which query ran rather than what came back.
describe('getVisitsFn', () => {
  it('gives guards every visit in the tenant', async () => {
    await getVisitsFn({ data: { tenantId: TENANT_ID } })

    expect(queries.getTenantVisitsQuery).toHaveBeenCalledWith(
      expect.anything(),
      TENANT_ID,
      expect.any(String),
    )
    expect(queries.getHouseVisitsQuery).not.toHaveBeenCalled()

    // Bounded window: the gate list must not grow forever
    const since = queries.getTenantVisitsQuery.mock.calls[0][2]!
    expect(Date.now() - new Date(since).getTime()).toBeGreaterThan(
      80 * 24 * 60 * 60 * 1000,
    )
  })

  it('scopes residents to their own house', async () => {
    session.user.role = 'user'
    await getVisitsFn({ data: { tenantId: TENANT_ID } })

    expect(queries.getHouseVisitsQuery).toHaveBeenCalledWith(
      expect.anything(),
      99,
    )
    expect(queries.getTenantVisitsQuery).not.toHaveBeenCalled()
  })

  it('queries nothing for a resident with no house', async () => {
    session.user.role = 'user'
    session.houseId = null
    await getVisitsFn({ data: { tenantId: TENANT_ID } })

    expect(queries.getHouseVisitsQuery).not.toHaveBeenCalled()
    expect(queries.getTenantVisitsQuery).not.toHaveBeenCalled()
  })
})

describe('checkInVisitFn', () => {
  it('records the arrival for staff', async () => {
    await checkInVisitFn({
      data: { visitId: VISIT_ID, plate: ' abc-123 ', idVerified: true },
    })

    expect(updated).toMatchObject({
      plate: 'abc-123',
      id_verified: true,
      checked_in_by: 'user-1',
    })
    expect(filters).toContainEqual(['eq', 'id', VISIT_ID])
  })

  it('refuses residents — the gate is not theirs to operate', async () => {
    // house_id 7 on the visit vs. house 99 for this user: even their own
    // house's visit must not be check-in-able from the resident UI.
    session.user.role = 'user'
    session.houseId = 7

    await expect(
      checkInVisitFn({ data: { visitId: VISIT_ID, idVerified: true } }),
    ).rejects.toThrow('Unauthorized')
    expect(updated).toBeNull()
  })
})
