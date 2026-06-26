import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from '../ui/button'

export interface SnackBarProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'info' | 'success' | 'warning' | 'error'
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  onClose?: () => void
  autoClose?: number
}

const typeConfig = {
  info: {
    bgColor: 'bg-gray-900 dark:bg-gray-800',
  },
  success: {
    bgColor: 'bg-green-900 dark:bg-green-800',
  },
  warning: {
    bgColor: 'bg-yellow-900 dark:bg-yellow-800',
  },
  error: {
    bgColor: 'bg-red-900 dark:bg-red-800',
  },
}

const SnackBar = React.forwardRef<HTMLDivElement, SnackBarProps>(
  (
    {
      className,
      type = 'info',
      message,
      action,
      onClose,
      autoClose = 5000,
      ...props
    },
    ref
  ) => {
    React.useEffect(() => {
      if (autoClose && onClose) {
        const timeout = setTimeout(onClose, autoClose)
        return () => clearTimeout(timeout)
      }
    }, [autoClose, onClose])

    const config = typeConfig[type]

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-3 px-4 py-3 rounded text-white shadow-lg',
          config.bgColor,
          className
        )}
        {...props}
      >
        <span className="text-sm flex-1">{message}</span>
        <div className="flex gap-2 flex-shrink-0">
          {action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className="text-white hover:bg-white/20 h-auto px-3 py-1"
            >
              {action.label}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }
)
SnackBar.displayName = 'SnackBar'

export { SnackBar }
