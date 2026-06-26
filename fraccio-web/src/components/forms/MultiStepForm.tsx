import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'

export interface MultiStepFormStep {
  id: string
  label: string
  description?: string
}

export interface MultiStepFormProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: MultiStepFormStep[]
  currentStep: number
  onStepChange: (step: number) => void
  onSubmit: () => void | Promise<void>
  children?: React.ReactNode
  isLoading?: boolean
  showStepIndicator?: boolean
}

const MultiStepForm = React.forwardRef<HTMLDivElement, MultiStepFormProps>(
  (
    {
      className,
      steps,
      currentStep,
      onStepChange,
      onSubmit,
      children,
      isLoading = false,
      showStepIndicator = true,
      ...props
    },
    ref
  ) => {
    const canGoBack = currentStep > 0
    const canGoNext = currentStep < steps.length - 1

    return (
      <div ref={ref} className={cn('flex flex-col gap-6', className)} {...props}>
        {/* Step Indicator */}
        {showStepIndicator && (
          <div className="flex gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  onClick={() => onStepChange(index)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm transition-colors',
                    index <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground/50'
                  )}
                  disabled={isLoading}
                >
                  {index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-1 w-8 transition-colors',
                      index < currentStep
                        ? 'bg-primary'
                        : 'bg-border'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current Step Info */}
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">
            {steps[currentStep].label}
          </h3>
          {steps[currentStep].description && (
            <p className="text-sm text-foreground/60">
              {steps[currentStep].description}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">{children}</div>

        {/* Navigation */}
        <div className="flex gap-2 justify-between">
          <Button
            variant="outline"
            onClick={() => onStepChange(currentStep - 1)}
            disabled={!canGoBack || isLoading}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {canGoNext ? (
              <Button
                onClick={() => onStepChange(currentStep + 1)}
                disabled={isLoading}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={onSubmit}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? 'Submitting...' : 'Submit'}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }
)
MultiStepForm.displayName = 'MultiStepForm'

export { MultiStepForm }
