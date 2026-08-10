import { beforeEach, describe, expect, it, vi } from 'vitest'

const filters: Array<[string, string, string]> = []
let deleted = false

const INVITE_ID = '11111111-1111-4111-8111-111111111111'

const guards = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  assertTenantAccess: vi.fn(),
}))

/** Minimal thenable query builder — see push-send.test.ts for the original. */
function builder() {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  }
  chain.delete = () => {
    deleted = true
    return chain
  }
  chain.select = () => chain
  chain.single = () =>
    Promise.resolve({
      data: { id: INVITE_ID, email: 'a@b.com', tenant_id: 'tenant-1' },
      error: null,
    })
  chain.eq = (column: string, value: string) => {
    filters.push(['eq', column, value])
    return chain
  }
  chain.lt = (column: string, value: string) => {
    filters.push(['lt', column, value])
    return chain
  }
  return chain
}

vi.mock('../supabase', () => ({ getSupabaseClient: () => ({ from: builder }) }))
vi.mock('./queries', () => ({ getInviteQuery: vi.fn() }))
vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))
vi.mock('../auth', () => guards)
vi.mock('../user', () => ({
  getUser: () => Promise.resolve({ role: 'admin', tenantIds: ['tenant-1'] }),
}))
vi.mock('../admin-users', () => ({ requireSuperadmin: vi.fn() }))
vi.mock('../email-send', () => ({ sendInviteEmail: vi.fn() }))

const { removeInviteFn, revokeInviteFn } = await import('./functions')

beforeEach(() => {
  filters.length = 0
  deleted = false
  guards.assertAdmin.mockReset()
  guards.assertTenantAccess.mockReset()
})

describe('removeInviteFn', () => {
  it('only ever deletes invites that have already expired', async () => {
    await removeInviteFn({ data: { token: 'invite-1' } })

    expect(filters).toContainEqual(['eq', 'id', 'invite-1'])

    // Without this filter the fn is a delete-any-invite-by-id endpoint, and it
    // is reachable unauthenticated from /accept-invite.
    const expiry = filters.find(
      ([op, column]) => op === 'lt' && column === 'expires_at',
    )
    expect(expiry).toBeTruthy()
    expect(new Date(expiry![2]).getTime()).toBeLessThanOrEqual(Date.now())
  })
})

describe('revokeInviteFn', () => {
  it('deletes the invite by id, scoped to its own tenant', async () => {
    await revokeInviteFn({ data: { inviteId: INVITE_ID } })

    expect(guards.assertTenantAccess).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-1',
    )
    expect(deleted).toBe(true)
    expect(filters).toContainEqual(['eq', 'id', INVITE_ID])
  })

  it('refuses non-admins before deleting anything', async () => {
    guards.assertAdmin.mockImplementation(() => {
      throw new Error('Unauthorized: Admin access required')
    })

    await expect(
      revokeInviteFn({ data: { inviteId: INVITE_ID } }),
    ).rejects.toThrow('Unauthorized')
    expect(deleted).toBe(false)
  })
})
