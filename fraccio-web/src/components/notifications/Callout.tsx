import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
}

const typeConfig = {
  info: {
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-l-4 border-blue-400',
    textColor: 'text-blue-900 dark:text-blue-100',
    Icon: Info,
  },
  success: {
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-l-4 border-green-400',
    textColor: 'text-green-900 dark:text-green-100',
    Icon: CheckCircle,
  },
  warning: {
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-l-4 border-yellow-400',
    textColor: 'text-yellow-900 dark:text-yellow-100',
    Icon: AlertTriangle,
  },
  error: {
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-l-4 border-red-400',
    textColor: 'text-red-900 dark:text-red-100',
    Icon: AlertCircle,
  },
}

const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  (
    { className, type = 'info', title, children, ...props },
    ref
  ) => {
    const config = typeConfig[type]
    const Icon = config.Icon

    return (
      <div
        ref={ref}
        className={cn(
          'p-4 rounded-md flex gap-3',
          config.bgColor,
          config.borderColor,
          className
        )}
        {...props}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.textColor)} />
        <div className="flex-1">
          {title && (
            <h4 className={cn('font-semibold mb-1', config.textColor)}>
              {title}
            </h4>
          )}
          <div className={cn('text-sm', config.textColor)}>
            {children}
          </div>
        </div>
      </div>
    )
  }
)
Callout.displayName = 'Callout'

export { Callout }
