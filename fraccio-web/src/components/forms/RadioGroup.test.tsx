import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RadioGroup } from './RadioGroup'

const options = [
  { label: 'Dueño', value: 'owner' },
  { label: 'Inquilino', value: 'tenant' },
  { label: 'Invitado', value: 'guest', disabled: true },
]

describe('RadioGroup', () => {
  it('reports the picked value', () => {
    const onChange = vi.fn()
    render(<RadioGroup options={options} value="owner" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText<HTMLInputElement>('Inquilino'))
    expect(onChange).toHaveBeenCalledWith('tenant')
  })

  it('checks only the option matching value', () => {
    render(<RadioGroup options={options} value="tenant" />)
    expect(screen.getByLabelText<HTMLInputElement>('Dueño').checked).toBe(false)
    expect(screen.getByLabelText<HTMLInputElement>('Inquilino').checked).toBe(
      true,
    )
    expect(screen.getByLabelText<HTMLInputElement>('Invitado').disabled).toBe(
      true,
    )
  })
})
