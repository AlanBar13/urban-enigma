import { useToast } from '@/components/notifications'
import { getUser, logoutFn } from '@/lib/user'
import { logger } from '@/utils/logger'
import { createFileRoute, isRedirect, Link, Outlet, redirect, useRouter, useRouterState } from '@tanstack/react-router'
import { Building, Home, Users, Menu, X, LogOut, LayoutDashboard, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin')({
    beforeLoad: async () => {
        try {
            const user = await getUser()
            if (user.role !== "superadmin") {
                throw redirect({ to: '/user-not-in-fracc' })
            }

            return { user }
        } catch (error) {
            logger('error', 'Error in admin route beforeLoad:', { error })
            if (isRedirect(error)) throw error
            throw redirect({ to: '/login' })
        }
    },
    component: RouteComponent,
    head: () => ({
        meta: [
            { title: 'Admin Dashboard | Fraccio' }
        ]
    })
})

function RouteComponent() {
    const { user } = Route.useRouteContext()
    const { addToast } = useToast()
    const router = useRouter()
    const routerState = useRouterState()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const onLogout = async () => {
        try {
            await logoutFn()
            router.navigate({ to: '/login', replace: true })
        } catch (error) {
            logger('error', 'Error during logout:', { error })
            addToast({ type: 'error', description: 'Error al cerrar sesión. Inténtalo de nuevo.', duration: 10000 })
        }
    }

    const navItems = [
        {
            id: '1',
            label: 'Dashboard',
            path: '/admin/',
            icon: LayoutDashboard,
            exact: true
        },
        {
            id: '2',
            label: 'Fraccionamientos',
            path: '/admin/fraccionamientos',
            icon: Building
        },
        {
            id: '3',
            label: 'Usuarios',
            path: '/admin/usuarios',
            icon: Users
        },
    ]

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navbar - Mobile & Desktop */}
            <header className="sticky top-0 z-50 bg-[var(--surface-container-low)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-container-low)]/80">
                <div className="flex h-16 items-center justify-between px-4 lg:px-6">
                    {/* Logo & Brand */}
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            {isSidebarOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </Button>
                        <Link to="/" className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg [background:linear-gradient(135deg,#000000,#131b2e)] flex items-center justify-center">
                                <Home className="h-5 w-5 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold">Fraccio</h1>
                                <p className="text-xs text-muted-foreground">Admin Panel</p>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = item.exact
                                ? routerState.location.pathname === item.path
                                : routerState.location.pathname.startsWith(item.path)

                            return (
                                <Link key={item.id} to={item.path}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            'gap-2 transition-colors',
                                            isActive
                                                ? 'text-[var(--on-surface)] font-semibold bg-[var(--surface-container-highest)]'
                                                : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)]'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Button>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface-container-highest)]">
                            <div className="h-8 w-8 rounded-full bg-[var(--surface-container)] flex items-center justify-center">
                                <Shield className="h-4 w-4 text-[var(--on-surface-variant)]" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onLogout}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-[var(--on-surface)]/30 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 bg-[var(--surface-container)] transition-transform duration-300 lg:hidden",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* User Info - Mobile */}
                    <div className="p-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-container-highest)]">
                            <div className="h-10 w-10 rounded-full bg-[var(--surface-dim)] flex items-center justify-center">
                                <Shield className="h-5 w-5 text-[var(--on-surface-variant)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user.full_name}</p>
                                <p className="text-sm text-muted-foreground">{user.role}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 p-4 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = item.exact
                                ? routerState.location.pathname === item.path
                                : routerState.location.pathname.startsWith(item.path)

                            return (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            'w-full justify-start gap-3 h-11 transition-colors',
                                            isActive
                                                ? 'text-[var(--on-surface)] font-semibold bg-[var(--surface-container-highest)]'
                                                : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)]'
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-base">{item.label}</span>
                                    </Button>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Logout Button - Mobile */}
                    <div className="p-4">
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                                setIsSidebarOpen(false)
                                onLogout()
                            }}
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="text-base">Cerrar Sesión</span>
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="p-4 md:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    )
}
