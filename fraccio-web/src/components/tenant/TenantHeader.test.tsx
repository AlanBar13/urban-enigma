import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TenantHeader } from './TenantHeader'

describe('TenantHeader', () => {
  it('renders the name, role and initials', () => {
    render(<TenantHeader tenantName="Villas del Sol" userRole="admin" />)
    expect(screen.getByText('Villas del Sol')).toBeTruthy()
    expect(screen.getByText('admin')).toBeTruthy()
    expect(screen.getByText('VDS')).toBeTruthy()
  })

  it('only shows the switch button when a handler is given', () => {
    const { unmount } = render(<TenantHeader tenantName="Villas del Sol" />)
    expect(screen.queryByRole('button')).toBeNull()
    unmount()

    const onSwitch = vi.fn()
    render(<TenantHeader tenantName="Villas del Sol" onSwitch={onSwitch} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSwitch).toHaveBeenCalled()
  })
})
