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

export interface FormModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  onSubmit: () => void | Promise<void>
  submitText?: string
  cancelText?: string
  isLoading?: boolean
}

const FormModal = React.forwardRef<HTMLDivElement, FormModalProps>(
  (
    {
      open = false,
      onOpenChange,
      title,
      description,
      children,
      onSubmit,
      submitText = 'Submit',
      cancelText = 'Cancel',
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

    const handleSubmit = async () => {
      setLoading(true)
      try {
        await onSubmit()
        handleOpenChange(false)
      } finally {
        setLoading(false)
      }
    }

    const isOpen = isControlled ? open : internalOpen

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent ref={ref} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="py-4">{children}</div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading || isLoading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || isLoading}
            >
              {loading || isLoading ? 'Loading...' : submitText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
)
FormModal.displayName = 'FormModal'

export { FormModal }
