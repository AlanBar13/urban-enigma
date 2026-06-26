import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { X, Plus } from 'lucide-react'

export interface DynamicFieldArrayProps extends React.HTMLAttributes<HTMLDivElement> {
  fields: any[]
  onAddField: () => void
  onRemoveField: (index: number) => void
  onFieldChange: (index: number, value: any) => void
  renderField: (field: any, index: number, onChange: (value: any) => void) => React.ReactNode
  label?: string
  addButtonLabel?: string
  minFields?: number
  maxFields?: number
}

const DynamicFieldArray = React.forwardRef<HTMLDivElement, DynamicFieldArrayProps>(
  (
    {
      className,
      fields,
      onAddField,
      onRemoveField,
      onFieldChange,
      renderField,
      label,
      addButtonLabel = 'Add Field',
      minFields = 1,
      maxFields,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1">
                {renderField(field, index, (value) =>
                  onFieldChange(index, value)
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveField(index)}
                disabled={fields.length <= (minFields || 1)}
                className="mt-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddField}
          disabled={maxFields ? fields.length >= maxFields : false}
          className="gap-2 w-fit"
        >
          <Plus className="h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>
    )
  }
)
DynamicFieldArray.displayName = 'DynamicFieldArray'

export { DynamicFieldArray }
