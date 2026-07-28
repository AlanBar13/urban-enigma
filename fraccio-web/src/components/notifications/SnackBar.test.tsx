import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SnackBar } from './SnackBar'

afterEach(() => {
  vi.useRealTimers()
})

describe('SnackBar', () => {
  it('auto-closes after the given delay', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<SnackBar message="Guardado" onClose={onClose} autoClose={3000} />)
    act(() => vi.advanceTimersByTime(2999))
    expect(onClose).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open when autoClose is 0', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<SnackBar message="Guardado" onClose={onClose} autoClose={0} />)
    act(() => vi.advanceTimersByTime(60000))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('runs the action and the manual close', () => {
    const onClick = vi.fn()
    const onClose = vi.fn()
    render(
      <SnackBar
        message="Guardado"
        action={{ label: 'Deshacer', onClick }}
        onClose={onClose}
        autoClose={0}
      />,
    )
    fireEvent.click(screen.getByText('Deshacer'))
    expect(onClick).toHaveBeenCalled()

    // buttons: action first, close second
    fireEvent.click(screen.getAllByRole('button')[1])
    expect(onClose).toHaveBeenCalled()
  })
})
