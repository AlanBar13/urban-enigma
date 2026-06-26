import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const listVariants = cva('flex flex-col gap-0', {
  variants: {
    variant: {
      vertical: 'flex-col',
      horizontal: 'flex-row flex-wrap',
    },
    spacing: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    },
    border: {
      none: '',
      divider: 'divide-y divide-border',
      outline: 'border border-border rounded-lg',
    },
  },
  defaultVariants: {
    variant: 'vertical',
    spacing: 'md',
    border: 'divider',
  },
})

export interface ListProps
  extends React.HTMLAttributes<HTMLUListElement>,
    VariantProps<typeof listVariants> {}

const List = React.forwardRef<HTMLUListElement, ListProps>(
  ({ className, variant, spacing, border, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn(listVariants({ variant, spacing, border }), className)}
      {...props}
    />
  )
)
List.displayName = 'List'

export interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  active?: boolean
  disabled?: boolean
}

const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ className, active, disabled, ...props }, ref) => (
    <li
      ref={ref}
      className={cn(
        'px-4 py-3 transition-colors',
        active && 'bg-accent text-accent-foreground',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:bg-muted/50 cursor-default',
        className
      )}
      {...props}
    />
  )
)
ListItem.displayName = 'ListItem'

export { List, ListItem, listVariants }
