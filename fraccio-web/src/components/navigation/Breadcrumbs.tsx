import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbProps extends React.OlHTMLAttributes<HTMLOListElement> {}

const Breadcrumb = React.forwardRef<HTMLOListElement, BreadcrumbProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label="breadcrumb"
      className={cn('text-sm text-foreground/60', className)}
    >
      <ol
        className="flex items-center gap-1"
        {...props}
      />
    </nav>
  )
)
Breadcrumb.displayName = 'Breadcrumb'

export interface BreadcrumbItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  isCurrent?: boolean
}

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, isCurrent, ...props }, ref) => (
    <li
      ref={ref}
      className={cn(
        'flex items-center gap-1',
        isCurrent && 'text-foreground font-medium',
        className
      )}
      {...props}
    />
  )
)
BreadcrumbItem.displayName = 'BreadcrumbItem'

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {}

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      'transition-colors hover:text-foreground hover:underline',
      className
    )}
    {...props}
  />
))
BreadcrumbLink.displayName = 'BreadcrumbLink'

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:h-3.5 [&>svg]:w-3.5', className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator'

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
}
