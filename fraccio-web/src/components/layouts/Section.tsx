import * as React from 'react'
import { cn } from '@/lib/utils'

const Section = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    variant?: 'default' | 'muted' | 'bordered'
  }
>(
  (
    {
      className,
      padding = 'md',
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const paddingMap = {
      xs: 'p-2',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-12',
    }

    const variantMap = {
      default: 'bg-background',
      muted: 'bg-muted/50',
      bordered: 'border border-border rounded-lg bg-card',
    }

    return (
      <section
        ref={ref}
        className={cn(
          paddingMap[padding],
          variantMap[variant],
          'rounded-lg transition-colors',
          className
        )}
        {...props}
      />
    )
  }
)
Section.displayName = 'Section'

export { Section }
