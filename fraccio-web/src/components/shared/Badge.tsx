import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: '[background:linear-gradient(135deg,#000000,#131b2e)] text-white',
        secondary: 'bg-[var(--surface-container)] text-[var(--on-surface)]',
        destructive: 'bg-[var(--error-container)] text-[var(--on-error-container)]',
        outline: 'text-foreground border border-border/40',
        success: 'bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]',
        warning: 'bg-[var(--error-container)] text-[var(--on-error-container)]',
        info: 'bg-[var(--surface-container-highest)] text-[var(--on-surface)]',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
