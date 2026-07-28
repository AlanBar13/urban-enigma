import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TenantSelector } from './TenantSelector'

const tenants = [
  { id: 't1', name: 'Villas del Sol', role: 'owner' as const },
  { id: 't2', name: 'Bosques', role: 'member' as const },
]

describe('TenantSelector', () => {
  it('shows the selected tenant on the trigger', () => {
    render(
      <TenantSelector
        tenants={tenants}
        selectedTenantId="t2"
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('Bosques')).toBeTruthy()
    expect(screen.queryByText('Villas del Sol')).toBeNull()
  })

  it('renders an empty trigger when the id matches nothing', () => {
    render(
      <TenantSelector
        tenants={tenants}
        selectedTenantId="missing"
        onSelect={vi.fn()}
      />,
    )
    expect(screen.queryByText('Bosques')).toBeNull()
    expect(screen.getByRole('combobox')).toBeTruthy()
  })
})
