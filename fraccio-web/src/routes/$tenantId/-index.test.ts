import { describe, expect, it, vi } from 'vitest'

const getAnunciosFn = vi.fn()
const getPaymentHistoryFn = vi.fn()
const getPaymentItemsFn = vi.fn()
const getAdminPaymentsFn = vi.fn()
const getHousesFn = vi.fn()

vi.mock('@/lib/anuncios', () => ({
  getAnunciosFn: (...args: Array<any>) => getAnunciosFn(...args),
}))
vi.mock('@/lib/stripe', () => ({
  getPaymentHistoryFn: (...args: Array<any>) => getPaymentHistoryFn(...args),
  getPaymentItemsFn: (...args: Array<any>) => getPaymentItemsFn(...args),
  getAdminPaymentsFn: (...args: Array<any>) => getAdminPaymentsFn(...args),
}))
vi.mock('@/lib/houses', () => ({
  getHousesFn: (...args: Array<any>) => getHousesFn(...args),
}))

const { Route } = await import('./index')
const loader = (Route.options as any).loader

const context = (features: unknown, role = 'admin') => ({
  tenant: { id: 't1', name: 'La Redonda', features },
  user: { role, full_name: 'Ana Ruiz', email: 'ana@x.com' },
})

describe('/$tenantId/ loader', () => {
  it('skips payment queries when the payments feature is off', async () => {
    getAnunciosFn.mockResolvedValue([])
    getHousesFn.mockResolvedValue([])

    const data = await loader({ context: context({}) })

    expect(data.paymentsOn).toBe(false)
    expect(getPaymentHistoryFn).not.toHaveBeenCalled()
    expect(getPaymentItemsFn).not.toHaveBeenCalled()
    expect(getAdminPaymentsFn).not.toHaveBeenCalled()
  })

  it('loads payments when the feature is on', async () => {
    getAnunciosFn.mockResolvedValue([])
    getHousesFn.mockResolvedValue([])
    getPaymentHistoryFn.mockResolvedValue([])
    getPaymentItemsFn.mockResolvedValue([{ id: 1 }])
    getAdminPaymentsFn.mockResolvedValue([])

    const data = await loader({ context: context({ payments: true }) })

    expect(data.paymentsOn).toBe(true)
    expect(data.paymentItems).toEqual([{ id: 1 }])
    expect(data.isAdmin).toBe(true)
    expect(data.userName).toBe('Ana Ruiz')
  })
})
