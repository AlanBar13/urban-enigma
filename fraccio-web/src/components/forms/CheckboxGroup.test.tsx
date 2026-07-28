import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CheckboxGroup } from './CheckboxGroup'

const options = [
  { label: 'Alberca', value: 'pool' },
  { label: 'Caseta', value: 'gate' },
  { label: 'Gimnasio', value: 'gym', disabled: true },
]

describe('CheckboxGroup', () => {
  it('adds the value when an unchecked box is checked', () => {
    const onChange = vi.fn()
    render(
      <CheckboxGroup options={options} value={['pool']} onChange={onChange} />,
    )
    fireEvent.click(screen.getByLabelText<HTMLInputElement>('Caseta'))
    expect(onChange).toHaveBeenCalledWith(['pool', 'gate'])
  })

  it('removes the value when a checked box is unchecked', () => {
    const onChange = vi.fn()
    render(
      <CheckboxGroup
        options={options}
        value={['pool', 'gate']}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByLabelText<HTMLInputElement>('Alberca'))
    expect(onChange).toHaveBeenCalledWith(['gate'])
  })

  it('reflects the selected values and disabled options', () => {
    render(<CheckboxGroup options={options} value={['gate']} />)
    expect(screen.getByLabelText<HTMLInputElement>('Alberca').checked).toBe(
      false,
    )
    expect(screen.getByLabelText<HTMLInputElement>('Caseta').checked).toBe(true)
    expect(screen.getByLabelText<HTMLInputElement>('Gimnasio').disabled).toBe(
      true,
    )
  })
})
