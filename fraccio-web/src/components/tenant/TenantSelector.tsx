import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../shared'
import { Button } from '../ui/button'
import { ChevronDown, Check } from 'lucide-react'

export interface Tenant {
  id: string
  name: string
  logo?: string
  role?: 'owner' | 'admin' | 'member' | 'viewer'
}

export interface TenantSelectorProps {
  tenants: Tenant[]
  selectedTenantId: string
  onSelect: (tenantId: string) => void
  label?: string
}

const TenantSelector: React.FC<TenantSelectorProps> = ({
  tenants,
  selectedTenantId,
  onSelect,
  label = 'Select workspace',
}) => {
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  return (
    <SelectPrimitive.Root value={selectedTenantId} onValueChange={onSelect}>
      <SelectPrimitive.Trigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between gap-2"
          onClick={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedTenant && (
              <>
                <Avatar size="sm">
                  <AvatarImage src={selectedTenant.logo} />
                  <AvatarFallback>
                    {getInitials(selectedTenant.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedTenant.name}</span>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            'relative z-50 max-h-96 min-w-[200px] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
          )}
          position="popper"
        >
          <SelectPrimitive.Viewport className="p-1">
            <SelectPrimitive.Group>
              <SelectPrimitive.Label className="px-2 py-1.5 text-xs font-medium text-foreground/70">
                {label}
              </SelectPrimitive.Label>
              {tenants.map((tenant) => (
                <SelectPrimitive.Item
                  key={tenant.id}
                  value={tenant.id}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    selectedTenantId === tenant.id &&
                      'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <Avatar size="sm">
                    <AvatarImage src={tenant.logo} />
                    <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tenant.name}</p>
                    {tenant.role && (
                      <p className="text-xs text-foreground/60 capitalize">
                        {tenant.role}
                      </p>
                    )}
                  </div>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Group>
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export { TenantSelector }
