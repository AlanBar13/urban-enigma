import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarNav } from './SidebarNav'
import type { SidebarNavItem } from './SidebarNav'

const items: Array<SidebarNavItem> = [
  { id: 'casa', label: 'Mi Casa' },
  {
    id: 'pagos',
    label: 'Pagos',
    children: [{ id: 'pagos-historial', label: 'Historial' }],
  },
  { id: 'admin', label: 'Administración', allowedRoles: ['admin'] },
  { id: 'docs', label: 'Documentos', disabled: true },
]

describe('SidebarNav', () => {
  it('hides items the role is not allowed to see', () => {
    const { unmount } = render(<SidebarNav items={items} role="member" />)
    expect(screen.queryByText('Administración')).toBeNull()
    unmount()

    render(<SidebarNav items={items} role="admin" />)
    expect(screen.getByText('Administración')).toBeTruthy()
  })

  it('shows role-gated items when no role is given', () => {
    render(<SidebarNav items={items} />)
    expect(screen.getByText('Administración')).toBeTruthy()
  })

  it('toggles children open and closed', () => {
    render(<SidebarNav items={items} />)
    expect(screen.queryByText('Historial')).toBeNull()
    fireEvent.click(screen.getByText('Pagos'))
    expect(screen.getByText('Historial')).toBeTruthy()
    fireEvent.click(screen.getByText('Pagos'))
    expect(screen.queryByText('Historial')).toBeNull()
  })

  it('calls both onItemClick and the item handler', () => {
    const onItemClick = vi.fn()
    const onClick = vi.fn()
    render(
      <SidebarNav
        items={[{ id: 'casa', label: 'Mi Casa', onClick }]}
        onItemClick={onItemClick}
      />,
    )
    fireEvent.click(screen.getByText('Mi Casa'))
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'casa' }),
    )
    expect(onClick).toHaveBeenCalled()
  })

  it('disables disabled items', () => {
    render(<SidebarNav items={items} />)
    const button = screen.getByText('Documentos').closest('button')
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders the badge', () => {
    render(<SidebarNav items={[{ id: 'a', label: 'Avisos', badge: 3 }]} />)
    expect(screen.getByText('3')).toBeTruthy()
  })
})
