import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'

describe('FormField', () => {
  it('marks required fields with an asterisk', () => {
    render(<FormField label="Nombre" required />)
    expect(screen.getByText('*')).toBeTruthy()
  })

  it('shows the hint when there is no error', () => {
    render(<FormField label="Nombre" hint="Como aparece en el contrato" />)
    expect(screen.getByText('Como aparece en el contrato')).toBeTruthy()
  })

  it('replaces the hint with the error', () => {
    render(<FormField label="Nombre" hint="Un hint" error="Requerido" />)
    expect(screen.getByText('Requerido')).toBeTruthy()
    expect(screen.queryByText('Un hint')).toBeNull()
  })

  it('renders its children', () => {
    render(
      <FormField label="Nombre">
        <input aria-label="nombre" />
      </FormField>,
    )
    expect(screen.getByLabelText('nombre')).toBeTruthy()
  })
})
