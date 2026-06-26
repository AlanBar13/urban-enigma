import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog'
import { Button } from '../ui/button'

export interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  actionText?: string
  onAction?: () => void
}

const typeConfig = {
  info: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  success: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900' },
  warning: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900' },
  error: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900' },
}

const AlertDialog = React.forwardRef<HTMLDivElement, AlertDialogProps>(
  (
    {
      open = false,
      onOpenChange,
      title,
      description,
      type = 'info',
      actionText = 'Dismiss',
      onAction,
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(open)
    const isControlled = onOpenChange !== undefined

    const handleOpenChange = (newOpen: boolean) => {
      if (isControlled) {
        onOpenChange?.(newOpen)
      } else {
        setInternalOpen(newOpen)
      }
    }

    const isOpen = isControlled ? open : internalOpen
    const config = typeConfig[type]

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent ref={ref}>
          <DialogHeader>
            <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${config.bgColor} mb-2`}>
              <span className={`${config.color} text-lg`}>
                {type === 'info' && 'ℹ'}
                {type === 'success' && '✓'}
                {type === 'warning' && '⚠'}
                {type === 'error' && '✕'}
              </span>
            </div>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => { onAction?.(); handleOpenChange(false); }}>
              {actionText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
)
AlertDialog.displayName = 'AlertDialog'

export { AlertDialog }
