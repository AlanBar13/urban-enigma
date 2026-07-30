import { beforeEach, describe, expect, it, vi } from 'vitest'

const getHousesFn = vi.fn()
const getTenantUsersFn = vi.fn()

vi.mock('@/lib/houses', () => ({
  getHousesFn: (...args: Array<any>) => getHousesFn(...args),
}))
vi.mock('@/lib/user', () => ({
  getTenantUsersFn: (...args: Array<any>) => getTenantUsersFn(...args),
}))

const { Route } = await import('./usuarios')
const loader = (Route.options as any).loader

describe('/$tenantId/usuarios loader', () => {
  beforeEach(() => {
    getHousesFn.mockReset().mockResolvedValue([{ id: 'h1' }])
    getTenantUsersFn.mockReset().mockResolvedValue([{ id: 'u1' }])
  })

  it('loads houses and users for the context tenant', async () => {
    const data = await loader({ context: { tenant: { id: 't1' } } })

    expect(getHousesFn).toHaveBeenCalledWith({ data: { tenantId: 't1' } })
    expect(getTenantUsersFn).toHaveBeenCalledWith({ data: { tenantId: 't1' } })
    expect(data).toEqual({ houses: [{ id: 'h1' }], users: [{ id: 'u1' }] })
  })

  it('rejects when a server function fails', async () => {
    getTenantUsersFn.mockRejectedValue(new Error('boom'))
    await expect(loader({ context: { tenant: { id: 't1' } } })).rejects.toThrow(
      'boom',
    )
  })
})
