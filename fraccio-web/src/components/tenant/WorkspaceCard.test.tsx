import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceCard } from './WorkspaceCard'

describe('WorkspaceCard', () => {
  it('renders name, role badge and initials', () => {
    render(<WorkspaceCard id="t1" name="Villas del Sol" role="owner" />)
    expect(screen.getByText('Villas del Sol')).toBeTruthy()
    expect(screen.getByText('owner')).toBeTruthy()
    expect(screen.getByText('VDS')).toBeTruthy()
  })

  it('pluralizes the member count', () => {
    const { unmount } = render(
      <WorkspaceCard id="t1" name="Villas" memberCount={1} />,
    )
    expect(screen.getByText('1 member')).toBeTruthy()
    unmount()

    render(<WorkspaceCard id="t1" name="Villas" memberCount={4} />)
    expect(screen.getByText('4 members')).toBeTruthy()
  })

  it('hides the member count when undefined', () => {
    render(<WorkspaceCard id="t1" name="Villas" />)
    expect(screen.queryByText(/member/)).toBeNull()
  })

  it('selects with its id', () => {
    const onSelect = vi.fn()
    render(<WorkspaceCard id="t1" name="Villas" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Villas'))
    expect(onSelect).toHaveBeenCalledWith('t1')
  })
})
