import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FormModal } from './FormModal'

describe('FormModal', () => {
  it('renders its children when open', () => {
    render(
      <FormModal
        open
        onOpenChange={vi.fn()}
        title="Crear Casa"
        onSubmit={vi.fn()}
      >
        <input aria-label="nombre" />
      </FormModal>,
    )
    expect(screen.getByLabelText('nombre')).toBeTruthy()
  })

  it('submits and then closes', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <FormModal
        open
        onOpenChange={onOpenChange}
        title="Crear Casa"
        onSubmit={onSubmit}
        submitText="Guardar"
      />,
    )
    fireEvent.click(screen.getByText('Guardar'))
    expect(onSubmit).toHaveBeenCalled()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('closes on cancel without submitting', () => {
    const onSubmit = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <FormModal
        open
        onOpenChange={onOpenChange}
        title="Crear Casa"
        onSubmit={onSubmit}
      />,
    )
    fireEvent.click(screen.getByText<HTMLButtonElement>('Cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables the footer while loading', () => {
    render(
      <FormModal
        open
        onOpenChange={vi.fn()}
        title="Crear Casa"
        onSubmit={vi.fn()}
        isLoading
      />,
    )
    expect(screen.getByText<HTMLButtonElement>('Loading...').disabled).toBe(
      true,
    )
  })
})
