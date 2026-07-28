import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MultiStepForm } from './MultiStepForm'

const steps = [
  { id: 'a', label: 'Datos', description: 'Tus datos' },
  { id: 'b', label: 'Casa' },
  { id: 'c', label: 'Revisión' },
]

describe('MultiStepForm', () => {
  it('shows the current step and advances', () => {
    const onStepChange = vi.fn()
    render(
      <MultiStepForm
        steps={steps}
        currentStep={0}
        onStepChange={onStepChange}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText('Tus datos')).toBeTruthy()
    expect(screen.getByText<HTMLButtonElement>('Previous').disabled).toBe(true)
    fireEvent.click(screen.getByText('Next'))
    expect(onStepChange).toHaveBeenCalledWith(1)
  })

  it('goes back from a middle step', () => {
    const onStepChange = vi.fn()
    render(
      <MultiStepForm
        steps={steps}
        currentStep={1}
        onStepChange={onStepChange}
        onSubmit={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText<HTMLButtonElement>('Previous'))
    expect(onStepChange).toHaveBeenCalledWith(0)
  })

  it('submits instead of advancing on the last step', () => {
    const onSubmit = vi.fn()
    render(
      <MultiStepForm
        steps={steps}
        currentStep={2}
        onStepChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.queryByText('Next')).toBeNull()
    fireEvent.click(screen.getByText('Submit'))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('jumps to a step from the indicator', () => {
    const onStepChange = vi.fn()
    render(
      <MultiStepForm
        steps={steps}
        currentStep={0}
        onStepChange={onStepChange}
        onSubmit={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('3'))
    expect(onStepChange).toHaveBeenCalledWith(2)
  })

  it('disables navigation while loading', () => {
    render(
      <MultiStepForm
        steps={steps}
        currentStep={2}
        onStepChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading
      />,
    )
    expect(screen.getByText<HTMLButtonElement>('Submitting...').disabled).toBe(
      true,
    )
  })
})
