import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  error?: string
  required?: boolean
  hint?: string
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    { className, label, error, required, hint, children, ...props },
    ref
  ) => (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}

      {children}

      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}

      {!error && hint && (
        <p className="text-sm text-foreground/60">{hint}</p>
      )}
    </div>
  )
)
FormField.displayName = 'FormField'

export { FormField }
