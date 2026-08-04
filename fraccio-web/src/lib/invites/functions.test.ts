import { describe, expect, it, vi } from 'vitest'

const filters: Array<[string, string, string]> = []

/** Minimal thenable query builder — see push-send.test.ts for the original. */
function builder() {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  }
  chain.delete = () => chain
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

const { removeInviteFn } = await import('./functions')

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
