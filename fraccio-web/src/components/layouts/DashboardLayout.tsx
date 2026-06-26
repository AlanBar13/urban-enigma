import * as React from 'react'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui/button'

export interface DashboardLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode
  header?: React.ReactNode
  children?: React.ReactNode
  sidebarWidth?: 'sm' | 'md' | 'lg'
  mobileBreakpoint?: 'sm' | 'md' | 'lg'
}

const DashboardLayout = React.forwardRef<HTMLDivElement, DashboardLayoutProps>(
  (
    {
      className,
      sidebar,
      header,
      children,
      sidebarWidth = 'md',
      mobileBreakpoint = 'md',
      ...props
    },
    ref
  ) => {
    const [sidebarOpen, setSidebarOpen] = React.useState(false)

    const sidebarWidthMap = {
      sm: 'w-48',
      md: 'w-64',
      lg: 'w-80',
    }

    const breakpointMap = {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    }

    return (
      <div
        ref={ref}
        className={cn('flex h-screen flex-col bg-background', className)}
        {...props}
      >
        {/* Header */}
        {header && (
          <header className="bg-[var(--surface-container-low)]">
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`${breakpointMap[mobileBreakpoint]}:hidden`}
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
              {header}
            </div>
          </header>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {sidebar && (
            <>
              {/* Mobile Sidebar Overlay */}
              {sidebarOpen && (
                <div
                  className={`fixed inset-0 z-40 bg-black/50 ${breakpointMap[mobileBreakpoint]}:hidden`}
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* Sidebar */}
              <aside
                className={cn(
                  `fixed bottom-0 left-0 top-0 z-50 bg-[var(--surface-container)] overflow-y-auto transition-transform ${sidebarWidthMap[sidebarWidth]} ${breakpointMap[mobileBreakpoint]}:static ${breakpointMap[mobileBreakpoint]}:z-auto ${breakpointMap[mobileBreakpoint]}:translate-x-0`,
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
              >
                {sidebar}
              </aside>
            </>
          )}

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    )
  }
)
DashboardLayout.displayName = 'DashboardLayout'

export { DashboardLayout }
