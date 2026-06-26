import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'

export interface SidebarNavItem {
  id: string
  label: string
  icon?: React.ReactNode
  href?: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  children?: SidebarNavItem[]
  badge?: string | number
  allowedRoles?: string[]
}

export interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {
  items: SidebarNavItem[]
  onItemClick?: (item: SidebarNavItem) => void
  role?: string
}

const SidebarNav = React.forwardRef<HTMLDivElement, SidebarNavProps>(
  ({ className, items, onItemClick, role, ...props }, ref) => {
    const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())

    const toggleExpanded = (itemId: string) => {
      const newExpanded = new Set(expandedItems)
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId)
      } else {
        newExpanded.add(itemId)
      }
      setExpandedItems(newExpanded)
    }

    const renderItems = (items: SidebarNavItem[], level = 0) => {
      return items.map((item) => {
        const isExpanded = expandedItems.has(item.id)
        const hasChildren = item.children && item.children.length > 0

        if (item.allowedRoles && role && !item.allowedRoles.includes(role)) {
          return null
        }

        return (
          <div key={item.id} className="relative">
            {item.active && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                style={{ backgroundColor: 'var(--tertiary-fixed)' }}
              />
            )}
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-2 transition-colors',
                item.active
                  ? 'text-[var(--on-surface)] font-semibold bg-transparent hover:bg-[var(--surface-container-highest)]'
                  : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)]',
                level > 0 && `pl-${4 + level * 4}`,
              )}
              disabled={item.disabled}
              onClick={() => {
                onItemClick?.(item)
                item.onClick?.()
                if (hasChildren) {
                  toggleExpanded(item.id)
                }
              }}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <span className="flex-shrink-0 rounded-full bg-[var(--surface-container-highest)] px-2 py-0.5 text-xs font-medium text-[var(--on-surface)]">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronDown
                  className={cn(
                    'h-4 w-4 flex-shrink-0 transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
              )}
            </Button>

            {hasChildren && isExpanded && item.children && (
              <div className="mt-1 space-y-1">
                {renderItems(item.children, level + 1)}
              </div>
            )}
          </div>
        )
      })
    }

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1', className)}
        {...props}
      >
        {renderItems(items)}
      </div>
    )
  }
)
SidebarNav.displayName = 'SidebarNav'

export { SidebarNav }
