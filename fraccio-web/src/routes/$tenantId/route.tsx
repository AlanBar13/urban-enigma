import { useToast } from '@/components/notifications'
import { getTenantFn } from '@/lib/tenants'
import { getUser, logoutFn } from '@/lib/user'
import { logger } from '@/utils/logger'
import { createFileRoute, isRedirect, Link, Outlet, redirect, useRouter, useRouterState } from '@tanstack/react-router'
import { Banknote, BookOpen, Building, House, Mail, UserPen, Menu, X, LogOut, LayoutDashboard, User, ChevronDown, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingBar } from '@/components/ui/spinner'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/$tenantId')({
    beforeLoad: async ({ params }) => {
        try {
            const tenant = await getTenantFn({ data: { path: params.tenantId } })
            if (!tenant) {
                logger('warn', 'Tenant not found:', { tenant: params.tenantId })
                throw redirect({ to: '/not-found' })
            }

            const user = await getUser()
            // Check if user is superadmin, if it is, allow access
            if (user.role === 'superadmin') {
                return { tenant, user }
            }

            // Check if user belongs to tenant
            if (user.tenantId !== tenant.id) {
                logger('warn', 'User does not belong to tenant:', { userEmail: user.email, tenantId: tenant.id })
                throw redirect({ to: '/user-not-in-fracc' })
            }

            return { tenant, user }
        } catch (error) {
            if (isRedirect(error)) throw error
            throw redirect({ to: '/login' })
        }
    },
    component: RouteComponent,
    head: async ({ params }) => {
        const tenant = await getTenantFn({ data: { path: params.tenantId } })

        return {
            meta: [
                {
                    title: `${tenant ? tenant.name : 'Fraccionamiento'} | Fraccio`
                }
            ]
        }
    }
})

function RouteComponent() {
    const { addToast } = useToast()
    const { tenant, user } = Route.useRouteContext()
    const router = useRouter()
    const routerState = useRouterState()
    const params = Route.useParams()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const onLogout = async () => {
        try {
            await logoutFn()
            router.navigate({ to: '/login', replace: true })
        } catch (error) {
            logger('error', 'Error during logout:', { error })
            addToast({ type: 'error', description: 'Error al cerrar sesión. Inténtalo de nuevo.', duration: 10000 })
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'superadmin':
                return 'Super Admin'
            case 'admin':
                return 'Administrador'
            case 'user':
                return 'Residente'
            default:
                return role
        }
    }

    const navItems = [
        {
            id: '1',
            label: 'Dashboard',
            path: `/${params.tenantId}/`,
            icon: LayoutDashboard,
            exact: true
        },
        {
            id: '2',
            label: 'Anuncios',
            path: `/${params.tenantId}/anuncios`,
            icon: Mail
        },
        {
            id: '3',
            label: 'Mi Casa',
            path: `/${params.tenantId}/casa`,
            icon: House
        },
        {
            id: '4',
            label: 'Pagos',
            path: `/${params.tenantId}/pagos`,
            icon: Banknote
        },
        {
            id: '5',
            label: 'Documentos',
            path: `/${params.tenantId}/documentos`,
            icon: BookOpen
        }
    ]

    const adminNavItems = [
        {
            id: '6',
            label: 'Usuarios',
            path: `/${params.tenantId}/usuarios`,
            icon: UserPen,
            allowedRoles: ['admin', 'superadmin']
        },
        {
            id: '7',
            label: 'Administrar Casas',
            path: `/${params.tenantId}/adminCasas`,
            icon: Building,
            allowedRoles: ['admin', 'superadmin']
        },
        {
            id: '8',
            label: 'Administrar Pagos',
            path: `/${params.tenantId}/admin-pagos`,
            icon: Banknote,
            allowedRoles: ['admin', 'superadmin']
        },
        {
            id: '9',
            label: 'Administrar Anuncios',
            path: `/${params.tenantId}/admin-anuncios`,
            icon: Megaphone,
            allowedRoles: ['admin', 'superadmin']
        },
        {
            id: '10',
            label: 'Administrar Documentos',
            path: `/${params.tenantId}/admin-documentos`,
            icon: BookOpen,
            allowedRoles: ['admin', 'superadmin']
        }
    ]

    const filteredAdminItems = adminNavItems.filter(item =>
        !item.allowedRoles || item.allowedRoles.includes(user.role)
    )

    const allNavItems = [...navItems, ...filteredAdminItems]

    // Check if router is loading
    const isLoading = routerState.status === 'pending'

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navbar - Mobile & Desktop */}
            <header className="sticky top-0 z-50 bg-[var(--surface-container-low)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-container-low)]/80">
                {/* Loading Bar */}
                {isLoading && <LoadingBar className="absolute top-0 left-0 right-0" />}
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
                        <Link to={`/$tenantId`} params={{ tenantId: params.tenantId }} className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg [background:linear-gradient(135deg,#000000,#131b2e)] flex items-center justify-center">
                                <Building className="h-5 w-5 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold">{tenant.name}</h1>
                                <p className="text-xs text-muted-foreground">/{tenant.path}</p>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = routerState.location.pathname.startsWith(item.path) && item.path !== `/${params.tenantId}/`

                            return (
                                <Link key={item.id} to={item.path}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
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

                        {/* Admin Items Dropdown */}
                        {filteredAdminItems.length > 0 && (
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                >
                                    <Building className="h-4 w-4" />
                                    Admin
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                                {isProfileOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsProfileOpen(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white/80 backdrop-blur-[12px] p-2 shadow-[0_20px_40px_var(--ambient-shadow)] z-50">
                                            {filteredAdminItems.map((item) => {
                                                const Icon = item.icon
                                                return (
                                                    <Link
                                                        key={item.id}
                                                        to={item.path}
                                                        onClick={() => setIsProfileOpen(false)}
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full justify-start gap-2"
                                                        >
                                                            <Icon className="h-4 w-4" />
                                                            {item.label}
                                                        </Button>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </nav>

                    {/* User Info & Actions */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface-container-highest)]">
                            <div className="h-8 w-8 rounded-full bg-[var(--surface-container)] flex items-center justify-center">
                                <User className="h-4 w-4 text-[var(--on-surface-variant)]" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
                            </div>
                        </div>
                        <Link to={`/$tenantId/perfil`} params={{ tenantId: params.tenantId }}>
                            <Button variant="ghost" size="icon" className="hidden lg:flex">
                                <UserPen className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onLogout}
                            className="text-muted-foreground hover:text-destructive hidden lg:flex"
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
                                <User className="h-5 w-5 text-[var(--on-surface-variant)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user.full_name}</p>
                                <p className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {allNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = routerState.location.pathname.startsWith(item.path) && item.path !== `/${params.tenantId}/`

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

                    {/* Footer Actions - Mobile */}
                    <div className="p-4 space-y-2">
                        <Link to={`/$tenantId/perfil`} params={{ tenantId: params.tenantId }}>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-11"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <UserPen className="h-5 w-5" />
                                <span className="text-base">Mi Perfil</span>
                            </Button>
                        </Link>
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
            <main className="p-4 md:p-6 lg:p-8 relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-start justify-center pt-20 z-40">
                        <div className="bg-white/80 backdrop-blur-[12px] rounded-xl shadow-[0_20px_40px_var(--ambient-shadow)] p-6 flex flex-col items-center gap-3">
                            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Cargando...</p>
                        </div>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    )
}
