import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './ToastContext'
import { ToastContainer } from './ToastContainer'

afterEach(() => {
  vi.useRealTimers()
})

function Harness() {
  const { addToast, clearToasts } = useToast()
  return (
    <>
      <button
        onClick={() =>
          addToast({ type: 'success', title: 'Listo', description: 'Guardado' })
        }
      >
        add
      </button>
      <button onClick={clearToasts}>clear</button>
      <ToastContainer />
    </>
  )
}

const renderHarness = () =>
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  )

describe('ToastContext', () => {
  it('throws outside a provider', () => {
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within ToastProvider',
    )
  })

  it('renders an added toast and auto-removes it after the default duration', () => {
    vi.useFakeTimers()
    renderHarness()
    fireEvent.click(screen.getByText('add'))
    expect(screen.getByText('Listo')).toBeTruthy()
    expect(screen.getByText('Guardado')).toBeTruthy()

    act(() => vi.advanceTimersByTime(4999))
    expect(screen.queryByText('Guardado')).toBeTruthy()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('Guardado')).toBeNull()
  })

  it('removes a toast from its close button', () => {
    renderHarness()
    fireEvent.click(screen.getByText('add'))
    // buttons: add, clear, then the toast close button
    fireEvent.click(screen.getAllByRole('button')[2])
    expect(screen.queryByText('Guardado')).toBeNull()
  })

  it('clears every toast', () => {
    renderHarness()
    fireEvent.click(screen.getByText('add'))
    fireEvent.click(screen.getByText('add'))
    expect(screen.getAllByText('Guardado')).toHaveLength(2)
    fireEvent.click(screen.getByText('clear'))
    expect(screen.queryByText('Guardado')).toBeNull()
  })
})
