import { beforeEach, describe, expect, it, vi } from 'vitest'

const getHousesFn = vi.fn()
const getTenantUsersFn = vi.fn()
const getTenantInvitesFn = vi.fn()

vi.mock('@/lib/houses', () => ({
  getHousesFn: (...args: Array<any>) => getHousesFn(...args),
}))
vi.mock('@/lib/user', () => ({
  getTenantUsersFn: (...args: Array<any>) => getTenantUsersFn(...args),
}))
vi.mock('@/lib/invites/functions', () => ({
  getTenantInvitesFn: (...args: Array<any>) => getTenantInvitesFn(...args),
}))

const { Route } = await import('./usuarios')
const loader = (Route.options as any).loader

describe('/$tenantId/usuarios loader', () => {
  beforeEach(() => {
    getHousesFn.mockReset().mockResolvedValue([{ id: 'h1' }])
    getTenantUsersFn.mockReset().mockResolvedValue([{ id: 'u1' }])
    getTenantInvitesFn.mockReset().mockResolvedValue([{ id: 'i1' }])
  })

  it('loads houses, users and invites for the context tenant', async () => {
    const data = await loader({ context: { tenant: { id: 't1' } } })

    expect(getHousesFn).toHaveBeenCalledWith({ data: { tenantId: 't1' } })
    expect(getTenantUsersFn).toHaveBeenCalledWith({ data: { tenantId: 't1' } })
    expect(getTenantInvitesFn).toHaveBeenCalledWith({
      data: { tenantId: 't1' },
    })
    expect(data).toEqual({
      houses: [{ id: 'h1' }],
      users: [{ id: 'u1' }],
      invites: [{ id: 'i1' }],
    })
  })

  it('rejects when a server function fails', async () => {
    getTenantUsersFn.mockRejectedValue(new Error('boom'))
    await expect(loader({ context: { tenant: { id: 't1' } } })).rejects.toThrow(
      'boom',
    )
  })
})
