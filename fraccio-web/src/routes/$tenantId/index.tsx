import { createFileRoute, Link } from '@tanstack/react-router'
import { getAnunciosFn } from '@/lib/anuncios'
import { getPaymentHistoryFn, getPaymentItemsFn, getAdminPaymentsFn } from '@/lib/stripe'
import { getHousesFn } from '@/lib/houses'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  CheckCircle,
  Clock,
  Bell,
  Banknote,
  Building,
  Home,
  FileText,
  ArrowRight,
  XCircle,
} from 'lucide-react'

export const Route = createFileRoute('/$tenantId/')({
  loader: async ({ context }) => {
    const isAdmin = context.user.role === 'admin' || context.user.role === 'superadmin'

    const [announcements, paymentHistory, paymentItems] = await Promise.all([
      getAnunciosFn({ data: { tenantId: context.tenant.id } }),
      getPaymentHistoryFn({ data: { tenantId: context.tenant.id } }),
      getPaymentItemsFn({ data: { tenantId: context.tenant.id } }),
    ])

    let adminPayments: Awaited<ReturnType<typeof getAdminPaymentsFn>> | null = null
    let houses: Awaited<ReturnType<typeof getHousesFn>> | null = null

    if (isAdmin) {
      ;[adminPayments, houses] = await Promise.all([
        getAdminPaymentsFn({ data: { tenantId: context.tenant.id } }),
        getHousesFn({ data: { tenantId: context.tenant.id } }),
      ])
    }

    return { announcements, paymentHistory, paymentItems, adminPayments, houses }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant, user } = Route.useRouteContext()
  const { announcements, paymentHistory, paymentItems, adminPayments, houses } =
    Route.useLoaderData()
  const params = Route.useParams()

  const isAdmin = user.role === 'admin' || user.role === 'superadmin'

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  // User payment stats
  const userCompleted = paymentHistory.filter((p) => p.status === 'completed')
  const userPending = paymentHistory.filter((p) => p.status === 'pending')
  const userTotalPaid = userCompleted.reduce((sum, p) => sum + p.amount, 0)

  // Admin stats
  const adminCompleted = adminPayments?.filter((p) => p.status === 'completed') ?? []
  const adminPending = adminPayments?.filter((p) => p.status === 'pending') ?? []
  const adminFailed = adminPayments?.filter((p) => p.status === 'failed') ?? []
  const adminTotalRevenue = adminCompleted.reduce((sum, p) => sum + p.amount, 0)

  const recentAnnouncements = announcements.slice(0, 4)
  const recentPayments = isAdmin ? (adminPayments ?? []).slice(0, 5) : paymentHistory.slice(0, 5)

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      completed: { label: 'Completado', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Fallido', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800' },
    }
    const info = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${info.className}`}>
        {info.label}
      </span>
    )
  }

  const paymentTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      maintenance: 'Mantenimiento',
      assessment: 'Cuota Especial',
      fine: 'Multa',
    }
    return map[type] ?? type
  }

  const statsCards = isAdmin
    ? [
        {
          title: 'Ingresos Totales',
          value: formatCurrency(adminTotalRevenue),
          icon: DollarSign,
          color: 'text-green-600',
          bg: 'bg-green-100',
        },
        {
          title: 'Pagos Completados',
          value: adminCompleted.length.toString(),
          icon: CheckCircle,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
        },
        {
          title: 'Pagos Pendientes',
          value: adminPending.length.toString(),
          icon: Clock,
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
        },
        {
          title: 'Pagos Fallidos',
          value: adminFailed.length.toString(),
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-100',
        },
        {
          title: 'Total de Casas',
          value: (houses?.length ?? 0).toString(),
          icon: Building,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
        },
        {
          title: 'Total Anuncios',
          value: announcements.length.toString(),
          icon: Bell,
          color: 'text-indigo-600',
          bg: 'bg-indigo-100',
        },
      ]
    : [
        {
          title: 'Total Pagado',
          value: formatCurrency(userTotalPaid),
          icon: DollarSign,
          color: 'text-green-600',
          bg: 'bg-green-100',
        },
        {
          title: 'Pagos Realizados',
          value: userCompleted.length.toString(),
          icon: CheckCircle,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
        },
        {
          title: 'Pagos Pendientes',
          value: userPending.length.toString(),
          icon: Clock,
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
        },
      ]

  const quickLinks = [
    { label: 'Anuncios', path: `/${params.tenantId}/anuncios`, icon: Bell },
    { label: 'Mi Casa', path: `/${params.tenantId}/casa`, icon: Home },
    { label: 'Pagos', path: `/${params.tenantId}/pagos`, icon: Banknote },
    { label: 'Documentos', path: `/${params.tenantId}/documentos`, icon: FileText },
  ]

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Bienvenido, {(user.full_name ?? user.email ?? 'Usuario').split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-0.5">{tenant.name}</p>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-3'} gap-4`}>
        {statsCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Announcements + Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Anuncios Recientes</h2>
            </div>
            <Link to="/$tenantId/anuncios" params={{ tenantId: params.tenantId }}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay anuncios recientes
            </p>
          ) : (
            <div className="space-y-2">
              {recentAnnouncements.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg bg-[var(--surface-container-highest)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight flex-1 min-w-0 truncate">
                      {a.title}
                    </p>
                    {a.owners_only && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded shrink-0">
                        Propietarios
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Payments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">
                {isAdmin ? 'Pagos Recientes' : 'Mis Pagos Recientes'}
              </h2>
            </div>
            <Link
              to={isAdmin ? '/$tenantId/admin-pagos' : '/$tenantId/pagos'}
              params={{ tenantId: params.tenantId }}
            >
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay pagos registrados
            </p>
          ) : (
            <div className="divide-y divide-[var(--surface-container-highest)]">
              {recentPayments.map((payment) => {
                const p = payment as typeof payment & {
                  profiles?: { full_name: string }
                  houses?: { name: string }
                }
                return (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isAdmin
                          ? (p.profiles?.full_name ?? 'Usuario')
                          : (p.description ?? paymentTypeLabel(p.payment_type))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin
                          ? `${p.houses?.name ?? '-'} · ${formatDate(p.created_at)}`
                          : formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(p.amount)}
                      </span>
                      {getStatusBadge(p.status)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Payment Items Available */}
      {paymentItems.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Conceptos de Pago Activos</h2>
            </div>
            <Link to="/$tenantId/pagos" params={{ tenantId: params.tenantId }}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                Ir a Pagos <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paymentItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--surface-container-highest)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {paymentTypeLabel(item.payment_type)}
                  </p>
                </div>
                <p className="text-sm font-bold ml-3 shrink-0 text-green-700">
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-base font-semibold mb-3">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map(({ label, path, icon: Icon }) => (
            <Link key={path} to={path}>
              <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-[var(--surface-container-highest)] transition-colors text-center">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
