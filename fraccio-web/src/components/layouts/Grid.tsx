import * as React from 'react'
import { cn } from '@/lib/utils'

const Grid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    cols?: 1 | 2 | 3 | 4 | 6 | 12
    gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    responsive?: boolean
  }
>(
  (
    {
      className,
      cols = 1,
      gap = 'md',
      responsive = true,
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

    const colsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    }

    const responsiveClasses = responsive
      ? 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : ''

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          colsMap[cols],
          gapMap[gap],
          responsiveClasses,
          className
        )}
        {...props}
      />
    )
  }
)
Grid.displayName = 'Grid'

export { Grid }
