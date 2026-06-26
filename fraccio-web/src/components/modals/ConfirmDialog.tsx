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

export interface ConfirmDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

const ConfirmDialog = React.forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      open = false,
      onOpenChange,
      title,
      description,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      onConfirm,
      onCancel,
      variant = 'default',
      isLoading = false,
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(open)
    const [loading, setLoading] = React.useState(false)

    const isControlled = onOpenChange !== undefined

    const handleOpenChange = (newOpen: boolean) => {
      if (isControlled) {
        onOpenChange?.(newOpen)
      } else {
        setInternalOpen(newOpen)
      }
    }

    const handleConfirm = async () => {
      setLoading(true)
      try {
        await onConfirm()
        handleOpenChange(false)
      } finally {
        setLoading(false)
      }
    }

    const handleCancel = () => {
      onCancel?.()
      handleOpenChange(false)
    }

    const isOpen = isControlled ? open : internalOpen

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent ref={ref}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading || isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={loading || isLoading}
            >
              {loading || isLoading ? 'Loading...' : confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
)
ConfirmDialog.displayName = 'ConfirmDialog'

export { ConfirmDialog }
