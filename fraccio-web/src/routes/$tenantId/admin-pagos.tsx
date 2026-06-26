import { createFileRoute, redirect } from '@tanstack/react-router'
import { getPaymentItemsFn, getAdminPaymentsFn } from '@/lib/stripe'
import PaymentItemsContainer from '@/components/admin/PaymentItemsContainer'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/shared'
import { DollarSign, TrendingUp, CheckCircle, XCircle } from 'lucide-react'

export const Route = createFileRoute('/$tenantId/admin-pagos')({
  beforeLoad: ({ context }) => {
    // Check if user is admin or superadmin
    if (context.user.role !== 'admin' && context.user.role !== 'superadmin') {
      throw redirect({ to: `/$tenantId/pagos`, params: { tenantId: context.tenant.path } })
    }
  },
  loader: async ({ context }) => {
    const itemsReq = getPaymentItemsFn({ data: { tenantId: context.tenant.id } })
    const paymentsReq = getAdminPaymentsFn({ data: { tenantId: context.tenant.id } })

    const [items, payments] = await Promise.all([itemsReq, paymentsReq])
    return { items, payments }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { items, payments } = Route.useLoaderData()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      completed: { label: 'Completado', class: 'bg-green-100 text-green-800' },
      pending: { label: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Fallido', class: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelado', class: 'bg-gray-100 text-gray-800' },
    }
    const statusInfo = statusMap[status] || { label: status, class: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${statusInfo.class}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getPaymentTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      maintenance: 'Mantenimiento',
      assessment: 'Cuota Especial',
      fine: 'Multa',
    }
    return typeMap[type] || type
  }

  // Calculate statistics
  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const completedPayments = payments.filter((p) => p.status === 'completed').length
  const pendingPayments = payments.filter((p) => p.status === 'pending').length
  const failedPayments = payments.filter((p) => p.status === 'failed').length

  const stats = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Pagos Completados',
      value: completedPayments.toString(),
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pagos Pendientes',
      value: pendingPayments.toString(),
      icon: TrendingUp,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Pagos Fallidos',
      value: failedPayments.toString(),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Administrar Pagos</h1>
        <p className="text-gray-600 mt-1">
          Gestiona conceptos de pago y visualiza todas las transacciones del fraccionamiento
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Payment Items Management */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Conceptos de Pago</h2>
        <PaymentItemsContainer tenantId={tenant.id} items={items} />
      </div>

      {/* All Payments Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Todos los Pagos</h2>
        {payments.length === 0 ? (
          <Card className="p-6">
            <p className="text-gray-600 text-center">No hay pagos registrados todavía</p>
          </Card>
        ) : (
          <DataTable
            data={payments}
            columns={[
              {
                key: 'created_at',
                label: 'Fecha',
                render: (value: string) =>
                  new Date(value).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
              },
              {
                key: 'profiles',
                label: 'Usuario',
                render: (value: any) => value?.full_name || '-',
              },
              {
                key: 'houses',
                label: 'Casa',
                render: (value: any) => value?.name || '-',
              },
              {
                key: 'description',
                label: 'Concepto',
              },
              {
                key: 'payment_type',
                label: 'Tipo',
                render: (value: string) => getPaymentTypeLabel(value),
              },
              {
                key: 'amount',
                label: 'Monto',
                render: (value: number) => formatCurrency(value),
              },
              {
                key: 'status',
                label: 'Estado',
                render: (value: string) => getStatusBadge(value),
              },
              {
                key: 'receipt_url',
                label: 'Recibo',
                render: (value: string | null) =>
                  value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  ),
              },
            ]}
            striped
          />
        )}
      </div>
    </div>
  )
}
