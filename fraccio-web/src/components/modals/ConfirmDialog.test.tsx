import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Borrar casa"
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByText('Borrar casa')).toBeNull()
  })

  it('confirms and then closes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Borrar casa"
        description="No se puede deshacer"
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByText('No se puede deshacer')).toBeTruthy()
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalled()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('cancels without confirming', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Borrar casa"
        cancelText="Cancelar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('disables both buttons while loading', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Borrar casa"
        onConfirm={vi.fn()}
        isLoading
      />,
    )
    expect(screen.getByText<HTMLButtonElement>('Cancel').disabled).toBe(true)
    expect(screen.getByText<HTMLButtonElement>('Loading...').disabled).toBe(
      true,
    )
  })
})
