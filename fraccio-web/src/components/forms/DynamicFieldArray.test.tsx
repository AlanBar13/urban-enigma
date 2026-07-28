import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DynamicFieldArray } from './DynamicFieldArray'

const renderField = (
  field: string,
  index: number,
  onChange: (v: any) => void,
) => (
  <input
    aria-label={`field-${index}`}
    value={field}
    onChange={(e) => onChange(e.target.value)}
  />
)

describe('DynamicFieldArray', () => {
  const noop = () => {}

  it('renders one row per field and reports changes with the index', () => {
    const onFieldChange = vi.fn()
    render(
      <DynamicFieldArray
        fields={['a', 'b']}
        onAddField={noop}
        onRemoveField={noop}
        onFieldChange={onFieldChange}
        renderField={renderField}
      />,
    )
    fireEvent.change(screen.getByLabelText('field-1'), {
      target: { value: 'c' },
    })
    expect(onFieldChange).toHaveBeenCalledWith(1, 'c')
  })

  it('disables remove at minFields and add at maxFields', () => {
    const { unmount } = render(
      <DynamicFieldArray
        fields={['a']}
        onAddField={noop}
        onRemoveField={noop}
        onFieldChange={noop}
        renderField={renderField}
        minFields={1}
      />,
    )
    // buttons: one remove per field, then the add button last
    let buttons = screen.getAllByRole('button')
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true)
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false)
    unmount()

    render(
      <DynamicFieldArray
        fields={['a', 'b']}
        onAddField={noop}
        onRemoveField={noop}
        onFieldChange={noop}
        renderField={renderField}
        maxFields={2}
      />,
    )
    buttons = screen.getAllByRole('button')
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(false)
    expect((buttons[2] as HTMLButtonElement).disabled).toBe(true)
  })

  it('fires add and remove', () => {
    const onAddField = vi.fn()
    const onRemoveField = vi.fn()
    render(
      <DynamicFieldArray
        fields={['a', 'b']}
        onAddField={onAddField}
        onRemoveField={onRemoveField}
        onFieldChange={noop}
        renderField={renderField}
        addButtonLabel="Agregar"
      />,
    )
    fireEvent.click(screen.getAllByRole('button')[1]) // remove on second field
    fireEvent.click(screen.getByText('Agregar'))
    expect(onRemoveField).toHaveBeenCalledWith(1)
    expect(onAddField).toHaveBeenCalled()
  })
})
