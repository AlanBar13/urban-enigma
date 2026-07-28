import { describe, expect, it, vi } from 'vitest'

const getAnunciosFn = vi.fn()

vi.mock('@/lib/anuncios', () => ({
  getAnunciosFn: (...args: Array<any>) => getAnunciosFn(...args),
}))

const { Route } = await import('./anuncios')
const loader = (Route.options as any).loader

describe('/$tenantId/anuncios loader', () => {
  it('loads announcements for the context tenant', async () => {
    getAnunciosFn.mockResolvedValue([{ id: 'a1', title: 'Aviso' }])

    const data = await loader({ context: { tenant: { id: 't1' } } })

    expect(getAnunciosFn).toHaveBeenCalledWith({ data: { tenantId: 't1' } })
    expect(data).toEqual({ announcements: [{ id: 'a1', title: 'Aviso' }] })
  })
})
