import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RoleBadge } from './RoleBadge'

describe('RoleBadge', () => {
  it.each([
    ['owner', 'Owner'],
    ['admin', 'Admin'],
    ['member', 'Member'],
    ['viewer', 'Viewer'],
  ] as const)('renders the label for %s', (role, label) => {
    render(<RoleBadge role={role} />)
    expect(screen.getByText(label)).toBeTruthy()
  })

  it('renders a span when outlined, a Badge div otherwise', () => {
    const { unmount } = render(<RoleBadge role="owner" variant="outlined" />)
    expect(screen.getByText('Owner').tagName).toBe('SPAN')
    unmount()

    render(<RoleBadge role="owner" />)
    expect(screen.getByText('Owner').tagName).toBe('DIV')
  })
})
