import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-2 pb-6 mb-6 md:flex-row md:items-center md:justify-between',
        className
      )}
      {...props}
    >
      <div className="flex-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--on-surface)]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-foreground/60">{description}</p>
        )}
      </div>
      {action && <div className="mt-4 md:mt-0">{action}</div>}
    </div>
  )
)
PageHeader.displayName = 'PageHeader'

export { PageHeader }
