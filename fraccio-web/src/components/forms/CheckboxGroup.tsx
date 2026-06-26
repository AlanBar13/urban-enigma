import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '../ui/label'

export interface CheckboxGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: Array<{ label: string; value: string; disabled?: boolean }>
  value?: string[]
  onChange?: (values: string[]) => void
  label?: string
  direction?: 'vertical' | 'horizontal'
}

const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  (
    { className, options, value = [], onChange, label, direction = 'vertical', ...props },
    ref
  ) => {
    const handleChange = (optionValue: string, checked: boolean) => {
      const newValue = checked
        ? [...value, optionValue]
        : value.filter((v) => v !== optionValue)
      onChange?.(newValue)
    }

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
                type="checkbox"
                id={option.value}
                checked={value.includes(option.value)}
                onChange={(e) => handleChange(option.value, e.target.checked)}
                disabled={option.disabled}
                className="h-4 w-4 rounded border border-border"
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
CheckboxGroup.displayName = 'CheckboxGroup'

export { CheckboxGroup }
