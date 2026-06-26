import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../shared'
import { Badge } from '../shared'

export interface WorkspaceCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  id: string
  name: string
  description?: string
  logo?: string
  memberCount?: number
  role?: 'owner' | 'admin' | 'member' | 'viewer'
  selected?: boolean
  onSelect?: (id: string) => void
}

const WorkspaceCard = React.forwardRef<HTMLDivElement, WorkspaceCardProps>(
  (
    {
      className,
      id,
      name,
      description,
      logo,
      memberCount,
      role,
      selected,
      onSelect,
      ...props
    },
    ref
  ) => {
    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()

    return (
      <div
        ref={ref}
        onClick={() => onSelect?.(id)}
        className={cn(
          'relative flex gap-4 rounded-lg border border-border/50 bg-card p-4 transition-all hover:shadow-md hover:border-border',
          selected && 'border-primary bg-primary/5 shadow-md',
          onSelect && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {/* Logo/Avatar */}
        <div className="flex-shrink-0">
          <Avatar size="lg">
            <AvatarImage src={logo} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">{name}</h3>
            {role && (
              <Badge
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                {role}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-foreground/60 line-clamp-2">
              {description}
            </p>
          )}
          {memberCount !== undefined && (
            <p className="mt-2 text-xs text-foreground/50">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </p>
          )}
        </div>

        {/* Selection Indicator */}
        {selected && (
          <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none" />
        )}
      </div>
    )
  }
)
WorkspaceCard.displayName = 'WorkspaceCard'

export { WorkspaceCard }
