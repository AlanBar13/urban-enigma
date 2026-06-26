import * as React from 'react'
import { Badge } from '../shared'
import { cn } from '@/lib/utils'

export interface RoleBadgeProps {
  role: 'owner' | 'admin' | 'member' | 'viewer'
  variant?: 'badge' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
}

const roleConfig = {
  owner: { label: 'Owner', color: '[background:linear-gradient(135deg,#000000,#131b2e)] text-white' },
  admin: { label: 'Admin', color: 'bg-[var(--surface-container-highest)] text-[var(--on-surface)]' },
  member: { label: 'Member', color: 'bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]' },
  viewer: { label: 'Viewer', color: 'bg-[var(--surface-container)] text-[var(--on-surface-variant)]' },
}

const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  variant = 'badge',
  size = 'md',
}) => {
  const config = roleConfig[role]

  if (variant === 'outlined') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border-2 font-semibold transition-colors',
          size === 'sm' && 'px-2 py-0.5 text-xs',
          size === 'md' && 'px-2.5 py-0.5 text-xs',
          size === 'lg' && 'px-3 py-1 text-sm',
          'border-border/40',
          config.color
        )}
      >
        {config.label}
      </span>
    )
  }

  return (
    <Badge
      variant={
        role === 'owner'
          ? 'default'
          : role === 'admin'
            ? 'secondary'
            : role === 'member'
              ? 'success'
              : 'outline'
      }
      size={size}
    >
      {config.label}
    </Badge>
  )
}

export { RoleBadge }
