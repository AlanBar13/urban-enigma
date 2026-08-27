import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { AlertCircle, CheckCircle, DollarSign, Home } from 'lucide-react'
import {
  createStripeOnboardingLinkFn,
  getAdminPaymentsFn,
  getPaymentItemsFn,
  getStripeAccountStatusFn,
} from '@/lib/stripe'
import {
  generateChargesFn,
  getPendingReviewFn,
  getTenantChargesFn,
} from '@/lib/payments/functions'
import { periodOf } from '@/lib/payments/charges'
import ReviewQueueContainer from '@/components/admin/ReviewQueueContainer'
import { getTenantUsersFn } from '@/lib/user'
import { isFeatureEnabled } from '@/lib/tenants'
import PaymentItemsContainer from '@/components/admin/PaymentItemsContainer'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared'
import { useToast } from '@/components/notifications'
import { logger } from '@/utils/logger'

export const Route = createFileRoute('/$tenantId/admin-pagos')({
  beforeLoad: ({ context }) => {
    // Before the role check — its /pagos redirect would loop when payments is off
    if (!isFeatureEnabled(context.tenant.features, 'payments')) {
      throw redirect({
        to: '/$tenantId',
        params: { tenantId: context.tenant.path },
      })
    }
    // Check if user is admin or superadmin
    if (context.user.role !== 'admin' && context.user.role !== 'superadmin') {
      throw redirect({
        to: `/$tenantId/pagos`,
        params: { tenantId: context.tenant.path },
      })
    }
  },
  loader: async ({ context }) => {
    const itemsReq = getPaymentItemsFn({
      data: { tenantId: context.tenant.id, includeInactive: true },
    })
    const paymentsReq = getAdminPaymentsFn({
      data: { tenantId: context.tenant.id },
    })
    const stripeStatusReq = getStripeAccountStatusFn({
      data: { tenantId: context.tenant.id },
    })

    // Needed so the admin can assign a payment item to specific residents
    const usersReq = getTenantUsersFn({ data: { tenantId: context.tenant.id } })

    const chargesReq = getTenantChargesFn({
      data: { tenantId: context.tenant.id },
    })
    const comprobanteOn = isFeatureEnabled(
      context.tenant.features,
      'comprobante',
    )
    const reviewReq = comprobanteOn
      ? getPendingReviewFn({ data: { tenantId: context.tenant.id } })
      : []

    const [items, payments, stripeStatus, users, charges, review] =
      await Promise.all([
        itemsReq,
        paymentsReq,
        stripeStatusReq,
        usersReq,
        chargesReq,
        reviewReq,
      ])
    return {
      items,
      payments,
      stripeStatus,
      users,
      charges,
      review,
      comprobanteOn,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const {
    items,
    payments,
    stripeStatus,
    users,
    charges,
    review,
    comprobanteOn,
  } = Route.useLoaderData()
  const { addToast } = useToast()
  const router = useRouter()
  const createOnboardingLink = useServerFn(createStripeOnboardingLinkFn)
  const generateCharges = useServerFn(generateChargesFn)
  const [connecting, setConnecting] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { created } = await generateCharges({
        data: { tenantId: tenant.id },
      })
      addToast({
        type: 'success',
        description: created
          ? `${created} cargo(s) generados para este mes`
          : 'Los cargos de este mes ya estaban generados',
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error generating charges:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al generar las cuotas',
        duration: 10000,
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleConnectStripe = async () => {
    setConnecting(true)
    try {
      const { url } = await createOnboardingLink({
        data: { tenantId: tenant.id },
      })
      window.location.href = url
    } catch (error: any) {
      logger('error', 'Error creating Stripe onboarding link:', { error })
      addToast({
        type: 'error',
        description:
          'Error al conectar con Stripe. Por favor intenta de nuevo.',
        duration: 10000,
      })
      setConnecting(false)
    }
  }

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
      in_review: { label: 'En revisión', class: 'bg-blue-100 text-blue-800' },
      failed: { label: 'Fallido', class: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelado', class: 'bg-gray-100 text-gray-800' },
    }
    const statusInfo = (
      statusMap as Record<string, { label: string; class: string } | undefined>
    )[status] || {
      label: status,
      class: 'bg-gray-100 text-gray-800',
    }
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${statusInfo.class}`}
      >
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

  // The cobranza numbers an administrator is asked for in an asamblea, not
  // transaction counts. All derived from the ledger — nothing is stored.
  const period = periodOf()
  const today = new Date().toISOString().slice(0, 10)

  const collectedThisMonth = charges
    .filter((c) => c.status === 'completed' && c.period === period)
    .reduce((sum, c) => sum + c.amount, 0)

  const outstanding = charges.filter((c) => c.status === 'pending')
  const outstandingTotal = outstanding.reduce((sum, c) => sum + c.amount, 0)

  // Vencido is derived: pending past its due date
  const overdue = outstanding.filter((c) => c.due_date && c.due_date < today)
  const overdueTotal = overdue.reduce((sum, c) => sum + c.amount, 0)

  const housesWithCharges = new Set(charges.map((c) => c.house_id))
  const housesOverdue = new Set(overdue.map((c) => c.house_id))
  const housesCurrent = housesWithCharges.size - housesOverdue.size

  const stats = [
    {
      title: 'Cobrado este mes',
      value: formatCurrency(collectedThisMonth),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Por cobrar',
      value: formatCurrency(outstandingTotal),
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Vencido',
      value: formatCurrency(overdueTotal),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Casas al corriente',
      value: `${housesCurrent} / ${housesWithCharges.size}`,
      icon: Home,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ]

  // Morosidad, one row per house that owes something
  const morosidad = [...housesOverdue]
    .map((houseId) => {
      const rows = overdue.filter((c) => c.house_id === houseId)
      const paid = charges
        .filter((c) => c.house_id === houseId && c.status === 'completed')
        .map((c) => c.created_at)
        .sort()
        .at(-1)
      return {
        houseId,
        house: rows[0]?.houses?.name ?? `Casa ${houseId}`,
        count: rows.length,
        balance: rows.reduce((sum, c) => sum + c.amount, 0),
        oldest:
          rows
            .map((c) => c.due_date)
            .sort()
            .at(0) ?? null,
        lastPayment: paid ?? null,
      }
    })
    .sort((a, b) => b.balance - a.balance)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Administrar Pagos</h1>
        <p className="text-gray-600 mt-1">
          Gestiona conceptos de pago y visualiza todas las transacciones del
          fraccionamiento
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

      {/* Stripe Connect Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Cuenta de Cobros (Stripe)</h2>
            <p className="text-gray-600 text-sm mt-1">
              {stripeStatus.chargesEnabled
                ? 'El fraccionamiento puede recibir pagos en su propia cuenta.'
                : stripeStatus.hasAccount
                  ? 'La configuración de la cuenta está incompleta. Continúa para habilitar los pagos.'
                  : 'Conecta una cuenta para que el fraccionamiento reciba los pagos directamente.'}
            </p>
          </div>
          {stripeStatus.chargesEnabled ? (
            <span className="flex items-center gap-1 px-3 py-1 text-sm font-medium rounded bg-green-100 text-green-800 whitespace-nowrap">
              <CheckCircle className="w-4 h-4" />
              Stripe conectado
            </span>
          ) : (
            <Button onClick={handleConnectStripe} disabled={connecting}>
              {connecting
                ? 'Redirigiendo...'
                : stripeStatus.hasAccount
                  ? 'Continuar configuración'
                  : 'Conectar Stripe'}
            </Button>
          )}
        </div>
      </Card>

      {/* Comprobantes waiting on a ruling — the cash/SPEI money the ledger can't see yet */}
      {comprobanteOn && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Por Revisar {review.length > 0 && `(${review.length})`}
          </h2>
          <ReviewQueueContainer tenantId={tenant.id} charges={review} />
        </div>
      )}

      {/* Morosidad */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">Morosidad</h2>
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generando...' : 'Generar cuotas del mes'}
          </Button>
        </div>
        {morosidad.length === 0 ? (
          <Card className="p-6">
            <p className="text-gray-600 text-center">
              Ninguna casa tiene cargos vencidos
            </p>
          </Card>
        ) : (
          <DataTable
            data={morosidad}
            columns={[
              { key: 'house', label: 'Casa' },
              { key: 'count', label: 'Cargos vencidos' },
              {
                key: 'oldest',
                label: 'Vencido desde',
                render: (value: string | null) =>
                  value
                    ? new Date(`${value}T00:00:00`).toLocaleDateString(
                        'es-MX',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        },
                      )
                    : '-',
              },
              {
                key: 'balance',
                label: 'Saldo',
                render: (value: number) => (
                  <span className="font-semibold text-red-700 tabular-nums">
                    {formatCurrency(value)}
                  </span>
                ),
              },
              {
                key: 'lastPayment',
                label: 'Último pago',
                render: (value: string | null) =>
                  value
                    ? new Date(value).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Nunca',
              },
            ]}
            striped
          />
        )}
      </div>

      {/* Payment Items Management */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Conceptos de Pago</h2>
        <PaymentItemsContainer
          tenantId={tenant.id}
          items={items}
          users={users}
        />
      </div>

      {/* All Payments Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Todos los Pagos</h2>
        {payments.length === 0 ? (
          <Card className="p-6">
            <p className="text-gray-600 text-center">
              No hay pagos registrados todavía
            </p>
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
