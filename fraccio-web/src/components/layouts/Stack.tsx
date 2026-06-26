import * as React from 'react'
import { cn } from '@/lib/utils'

const Stack = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    direction?: 'row' | 'col'
    gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    align?: 'start' | 'center' | 'end' | 'stretch'
    justify?: 'start' | 'center' | 'between' | 'end'
  }
>(
  (
    {
      className,
      direction = 'col',
      gap = 'md',
      align = 'start',
      justify = 'start',
      ...props
    },
    ref
  ) => {
    const gapMap = {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    }

    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    }

    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      between: 'justify-between',
      end: 'justify-end',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          direction === 'row' ? 'flex-row' : 'flex-col',
          gapMap[gap],
          alignMap[align],
          justifyMap[justify],
          className
        )}
        {...props}
      />
    )
  }
)
Stack.displayName = 'Stack'

export { Stack }
