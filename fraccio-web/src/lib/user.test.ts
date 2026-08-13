import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
}))

/** Minimal thenable query builder — see push-send.test.ts for the original. */
function builder() {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.single = () =>
    Promise.resolve({
      data: {
        full_name: 'A',
        role: 'user',
        tenant_id: 'tenant-1',
        is_active: true,
        tenant_admins: [],
      },
      error: null,
    })
  return chain
}

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({ auth, from: builder }),
}))
vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))

const { requestPasswordResetFn, resetPasswordFn, changePasswordFn } =
  await import('./user')

const ERROR = { error: { message: 'boom' } }
const OK = { error: null }

beforeEach(() => {
  Object.values(auth).forEach((fn) => fn.mockReset())
  auth.updateUser.mockResolvedValue(OK)
  auth.signOut.mockResolvedValue(OK)
  auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'a@b.com' } },
    error: null,
  })
})

describe('requestPasswordResetFn', () => {
  it('swallows the email failure instead of surfacing which addresses exist', async () => {
    auth.resetPasswordForEmail.mockResolvedValue(ERROR)

    // Must not throw: a rejection here is itself the enumeration signal.
    await requestPasswordResetFn({ data: { email: 'a@b.com' } })

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com')
  })
})

describe('resetPasswordFn', () => {
  it('never sets a password when the recovery token is rejected', async () => {
    auth.verifyOtp.mockResolvedValue(ERROR)

    await resetPasswordFn({
      data: { tokenHash: 'bad-token', password: 'newpass' },
    }).catch(() => {})

    expect(auth.updateUser).not.toHaveBeenCalled()
  })
})

describe('changePasswordFn', () => {
  it('never sets a password when the current one is wrong', async () => {
    auth.signInWithPassword.mockResolvedValue(ERROR)

    await changePasswordFn({
      data: { currentPassword: 'wrong', password: 'newpass' },
    }).catch(() => {})

    expect(auth.updateUser).not.toHaveBeenCalled()
  })
})
