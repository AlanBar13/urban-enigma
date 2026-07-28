import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AlertDialog } from './AlertDialog'

describe('AlertDialog', () => {
  it('shows title, description and the type glyph', () => {
    render(
      <AlertDialog
        open
        onOpenChange={vi.fn()}
        title="Listo"
        description="Se guardó"
        type="success"
      />,
    )
    expect(screen.getByText('Listo')).toBeTruthy()
    expect(screen.getByText('Se guardó')).toBeTruthy()
    expect(screen.getByText('✓')).toBeTruthy()
  })

  it('runs the action and closes', () => {
    const onAction = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <AlertDialog
        open
        onOpenChange={onOpenChange}
        title="Error"
        type="error"
        actionText="Entendido"
        onAction={onAction}
      />,
    )
    fireEvent.click(screen.getByText('Entendido'))
    expect(onAction).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders nothing while closed', () => {
    render(<AlertDialog open={false} onOpenChange={vi.fn()} title="Error" />)
    expect(screen.queryByText('Error')).toBeNull()
  })
})
