import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders title, description and children', () => {
    render(
      <Alert title="Aviso" description="Corte de agua">
        <span>mañana</span>
      </Alert>,
    )
    expect(screen.getByText('Aviso')).toBeTruthy()
    expect(screen.getByText('Corte de agua')).toBeTruthy()
    expect(screen.getByText('mañana')).toBeTruthy()
  })

  it('closes when closable with a handler', () => {
    const onClose = vi.fn()
    render(<Alert title="Aviso" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalled()
  })

  it('has no close button without a handler or when not closable', () => {
    const { unmount } = render(<Alert title="Aviso" />)
    expect(screen.queryByRole('button')).toBeNull()
    unmount()

    render(<Alert title="Aviso" closable={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
