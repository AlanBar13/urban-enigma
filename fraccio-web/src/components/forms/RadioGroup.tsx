import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '../ui/label'

export interface RadioGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: Array<{ label: string; value: string; disabled?: boolean }>
  value?: string
  onChange?: (value: string) => void
  label?: string
  direction?: 'vertical' | 'horizontal'
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    { className, options, value, onChange, label, direction = 'vertical', ...props },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
        {label && (
          <Label className="font-medium text-foreground">{label}</Label>
        )}
        <div
          className={cn(
            'flex gap-3',
            direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
          )}
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                id={option.value}
                name={label || 'radio-group'}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                className="h-4 w-4 border border-border"
              />
              <Label
                htmlFor={option.value}
                className={cn(option.disabled && 'opacity-50 cursor-not-allowed')}
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

export { RadioGroup }
