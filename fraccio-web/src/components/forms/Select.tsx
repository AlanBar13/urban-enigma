import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
      <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transform pointer-events-none opacity-50" />
    </div>
  )
)
Select.displayName = 'Select'

export { Select }
