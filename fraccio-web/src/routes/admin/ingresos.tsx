import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CreditCard, DollarSign, Receipt, TrendingUp } from 'lucide-react'
import type { TenantRevenue } from '@/lib/revenue'
import { DataTable } from '@/components/shared'
import { getMonthlyRevenueFn } from '@/lib/revenue'

/** Current month as YYYY-MM in UTC — the backend buckets by UTC too. */
const currentMonth = () => new Date().toISOString().slice(0, 7)

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export const Route = createFileRoute('/admin/ingresos')({
  // Month lives in the URL so the view is linkable and the loader re-runs on change
  validateSearch: (search: Record<string, unknown>) => {
    const month = search.month
    return {
      month:
        typeof month === 'string' && MONTH_RE.test(month)
          ? month
          : currentMonth(),
    }
  },
  loaderDeps: ({ search: { month } }) => ({ month }),
  loader: async ({ deps: { month } }) => {
    const revenue = await getMonthlyRevenueFn({ data: { month } })
    return { revenue }
  },
  component: RouteComponent,
  head: () => ({ meta: [{ title: 'Ingresos | Fraccio' }] }),
})

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)

/** "2026-08" -> "agosto de 2026" */
const monthLabel = (month: string) => {
  const [year, mon] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, mon - 1, 1)))
}

function RouteComponent() {
  const { revenue } = Route.useLoaderData()
  const { month } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const statCards = [
    {
      title: 'Total del mes',
      value: revenue.totals.total,
      icon: DollarSign,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Suscripciones',
      value: revenue.totals.subscriptions,
      icon: CreditCard,
      color: 'bg-chart-2/10 text-chart-2',
    },
    {
      title: 'Comisiones',
      value: revenue.totals.commissions,
      icon: Receipt,
      color: 'bg-accent/10 text-accent',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ingresos de Fraccio</h1>
          <p className="text-muted-foreground">
            Lo que cobramos nosotros en {monthLabel(month)} — mensualidades y
            comisiones. No incluye las cuotas que los colonos pagan a su
            fraccionamiento.
          </p>
        </div>
        <label className="text-sm">
          <span className="block text-muted-foreground mb-1">Mes</span>
          <input
            type="month"
            className="h-10 rounded-md border bg-transparent px-3 text-sm"
            value={month}
            onChange={(e) => {
              // Clearing the native input yields '' — keep the current month
              const next = e.target.value
              if (MONTH_RE.test(next)) {
                navigate({ search: { month: next } })
              }
            }}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="bg-card border rounded-xl p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold">
                  {formatCurrency(stat.value)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Por fraccionamiento</h2>
        {revenue.tenants.length > 0 ? (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Fraccionamiento',
                render: (value: string, row: TenantRevenue) =>
                  // A Stripe account/customer with no matching tenant. Shown, not
                  // hidden — otherwise the totals silently stop matching Stripe.
                  row.tenantId ? (
                    value
                  ) : (
                    <span className="text-muted-foreground italic">
                      {value}
                    </span>
                  ),
              },
              {
                key: 'plan',
                label: 'Plan',
                render: (value: string | null) =>
                  value ? <span className="capitalize">{value}</span> : '—',
              },
              {
                key: 'subscriptions',
                label: 'Suscripción',
                render: (value: number) => formatCurrency(value),
              },
              {
                key: 'commissions',
                label: 'Comisiones',
                render: (value: number) => formatCurrency(value),
              },
              { key: 'paymentsCount', label: 'Pagos' },
              {
                key: 'total',
                label: 'Total',
                render: (value: number) => (
                  <span className="font-semibold">{formatCurrency(value)}</span>
                ),
              },
            ]}
            data={revenue.tenants}
          />
        ) : (
          // DataTable's own empty state is hardcoded English
          <div className="bg-card border rounded-xl text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No hubo ingresos en {monthLabel(month)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
