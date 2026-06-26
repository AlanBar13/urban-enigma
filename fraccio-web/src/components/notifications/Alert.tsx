import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react'
import { Button } from '../ui/button'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  description?: string
  onClose?: () => void
  closable?: boolean
}

const typeConfig = {
  info: {
    bgColor: 'bg-[var(--surface-container-highest)]',
    borderColor: '',
    textColor: 'text-[var(--on-surface)]',
    Icon: Info,
  },
  success: {
    bgColor: 'bg-[var(--tertiary-container)]',
    borderColor: '',
    textColor: 'text-[var(--on-tertiary-container)]',
    Icon: CheckCircle,
  },
  warning: {
    bgColor: 'bg-[var(--error-container)]',
    borderColor: '',
    textColor: 'text-[var(--on-error-container)]',
    Icon: AlertTriangle,
  },
  error: {
    bgColor: 'bg-[var(--error-container)]',
    borderColor: '',
    textColor: 'text-[var(--on-error-container)]',
    Icon: AlertCircle,
  },
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      type = 'info',
      title,
      description,
      onClose,
      closable = true,
      children,
      ...props
    },
    ref
  ) => {
    const config = typeConfig[type]
    const Icon = config.Icon

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full rounded-lg px-4 py-3 flex gap-3',
          config.bgColor,
          className
        )}
        {...props}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.textColor)} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn('font-semibold', config.textColor)}>
              {title}
            </h4>
          )}
          {description && (
            <p className={cn('text-sm', config.textColor)}>
              {description}
            </p>
          )}
          {children && (
            <div className={cn('text-sm', config.textColor)}>
              {children}
            </div>
          )}
        </div>
        {closable && onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={cn('h-6 w-6 p-0 flex-shrink-0', config.textColor)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }
)
Alert.displayName = 'Alert'

export { Alert }
