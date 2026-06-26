import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../shared'
import { Button } from '../ui/button'
import { ChevronDown } from 'lucide-react'

export interface TenantHeaderProps {
  tenantName: string
  tenantLogo?: string
  userRole?: 'owner' | 'admin' | 'member' | 'viewer'
  onSwitch?: () => void
  className?: string
}

const TenantHeader = React.forwardRef<HTMLDivElement, TenantHeaderProps>(
  (
    { tenantName, tenantLogo, userRole, onSwitch, className, ...props },
    ref
  ) => {
    const initials = tenantName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--surface-container-highest)]',
          className
        )}
        {...props}
      >
        <Avatar size="md">
          <AvatarImage src={tenantLogo} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {tenantName}
          </p>
          {userRole && (
            <p className="text-xs text-foreground/60 capitalize">{userRole}</p>
          )}
        </div>

        {onSwitch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSwitch}
            className="gap-1"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }
)
TenantHeader.displayName = 'TenantHeader'

export { TenantHeader }
