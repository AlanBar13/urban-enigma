import { beforeEach, describe, expect, it, vi } from 'vitest'

const SELF = '00000000-0000-4000-8000-0000000000aa'
const OTHER = '00000000-0000-4000-8000-0000000000bb'

let role = 'superadmin'
let payment: unknown = null
const deletedFrom: Array<string> = []
const authDeleted: Array<string> = []
let authDeleteFails = false

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
    auth: {
      admin: {
        deleteUser: (id: string) => {
          if (authDeleteFails)
            return Promise.resolve({ error: new Error('no') })
          authDeleted.push(id)
          return Promise.resolve({ error: null })
        },
      },
    },
  }),
}))

vi.mock('./user', () => ({
  getUser: () => Promise.resolve({ id: SELF, email: 'root@example.com', role }),
}))

vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))

const { deleteUserFn } = await import('./admin-users')

describe('deleteUserFn', () => {
  beforeEach(() => {
    role = 'superadmin'
    payment = null
    authDeleteFails = false
    deletedFrom.length = 0
    authDeleted.length = 0
  })

  it('refuses a caller who is not a superadmin', async () => {
    // A tenant admin gets the reversible setUserActiveFn, never this.
    role = 'admin'

    await expect(deleteUserFn({ data: { userId: OTHER } })).rejects.toThrow(
      'Superadmin access required',
    )

    expect(deletedFrom).toEqual([])
    expect(authDeleted).toEqual([])
  })

  it('refuses to delete the calling superadmin', async () => {
    await expect(deleteUserFn({ data: { userId: SELF } })).rejects.toThrow(
      'tu propia cuenta',
    )

    expect(authDeleted).toEqual([])
  })

  it('refuses a user with payments', async () => {
    payment = { id: 'p1' }

    await expect(deleteUserFn({ data: { userId: OTHER } })).rejects.toThrow(
      'pagos registrados',
    )

    expect(deletedFrom).toEqual([])
    expect(authDeleted).toEqual([])
  })

  it('leaves the profile in place when the auth delete fails', async () => {
    // Without a profile row getUser throws for everyone, so a half-delete here
    // would be worse than no delete.
    authDeleteFails = true

    await expect(deleteUserFn({ data: { userId: OTHER } })).rejects.toThrow(
      'cuenta de acceso',
    )

    expect(deletedFrom).not.toContain('profiles')
  })

  it('deletes dependents, the auth account, then the profile', async () => {
    await deleteUserFn({ data: { userId: OTHER } })

    expect(deletedFrom).toEqual([
      'house_owners',
      'house_users',
      'tenant_admins',
      'push_subscriptions',
      'profiles',
    ])
    expect(authDeleted).toEqual([OTHER])
  })
})
