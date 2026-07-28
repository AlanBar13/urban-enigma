import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../notifications/ToastContext'
import { ToastContainer } from '../notifications/ToastContainer'

const createTenantFn = vi.fn()

vi.mock('@tanstack/react-start', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useServerFn: (fn: any) => fn,
}))
vi.mock('@/lib/tenants', () => ({
  createTenantFn: (...args: Array<any>) => createTenantFn(...args),
}))

const { default: FraccContainer } = await import('./FraccContainer')

const renderContainer = () =>
  render(
    <ToastProvider>
      <FraccContainer tenants={[{ name: 'Villas', path: 'villas' }]} />
      <ToastContainer />
    </ToastProvider>,
  )

describe('FraccContainer', () => {
  it('lists the tenants', () => {
    renderContainer()
    expect(screen.getByText('Villas')).toBeTruthy()
    expect(screen.getByText('villas')).toBeTruthy()
  })

  it('slugifies the name into the subdomain on blur', () => {
    renderContainer()
    fireEvent.click(screen.getByText('Agregar Fraccionamiento'))

    const name = screen.getByPlaceholderText('Nombre del fraccionamiento')
    fireEvent.change(name, { target: { value: '  Villas del Sol!  ' } })
    fireEvent.blur(name)

    expect(
      screen.getByPlaceholderText<HTMLInputElement>(
        'Subdominio del fraccionamiento',
      ).value,
    ).toBe('villas-del-sol')
  })

  it('creates the tenant with the typed values', async () => {
    createTenantFn.mockResolvedValue({})
    renderContainer()
    fireEvent.click(screen.getByText('Agregar Fraccionamiento'))

    const name = screen.getByPlaceholderText('Nombre del fraccionamiento')
    fireEvent.change(name, { target: { value: 'Villas del Sol' } })
    fireEvent.blur(name)
    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() =>
      expect(createTenantFn).toHaveBeenCalledWith({
        data: { name: 'Villas del Sol', subdomain: 'villas-del-sol' },
      }),
    )
  })

  it('reports a failed creation as an error toast', async () => {
    createTenantFn.mockRejectedValue(new Error('boom'))
    renderContainer()
    fireEvent.click(screen.getByText('Agregar Fraccionamiento'))
    fireEvent.click(screen.getByText('Submit'))

    expect(
      await screen.findByText('Error al crear el fraccionamiento'),
    ).toBeTruthy()
  })
})
