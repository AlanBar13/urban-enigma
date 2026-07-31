import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import {
  createCheckoutSessionFn,
  getPaymentHistoryFn,
  getPaymentItemsFn,
} from '@/lib/stripe'
import { isFeatureEnabled } from '@/lib/tenants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared'
import { useToast } from '@/components/notifications'
import { logger } from '@/utils/logger'

export const Route = createFileRoute('/$tenantId/pagos/')({
  beforeLoad: ({ context }) => {
    if (!isFeatureEnabled(context.tenant.features, 'payments')) {
      throw redirect({
        to: '/$tenantId',
        params: { tenantId: context.tenant.path },
      })
    }
  },
  loader: async ({ context }) => {
    const itemsReq = getPaymentItemsFn({
      data: { tenantId: context.tenant.id },
    })
    const historyReq = getPaymentHistoryFn({
      data: { tenantId: context.tenant.id },
    })

    const [items, history] = await Promise.all([itemsReq, historyReq])
    return { items, history }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { items, history } = Route.useLoaderData()
  const { addToast } = useToast()
  const createCheckoutSession = useServerFn(createCheckoutSessionFn)
  const [loading, setLoading] = useState<number | null>(null)
  // UX only — the backend rejects checkout (409) until the tenant finishes Stripe onboarding
  const paymentsEnabled = tenant.stripe_charges_enabled

  const handlePayment = async (itemId: number) => {
    setLoading(itemId)
    try {
      const result = await createCheckoutSession({
        data: {
          paymentItemId: itemId,
          tenantId: tenant.id,
        },
      })

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error: any) {
      logger('error', 'Error creating checkout session:', { error })
      addToast({
        type: 'error',
        description:
          error.message ||
          'Error al procesar el pago. Por favor intenta de nuevo.',
        duration: 10000,
      })
      setLoading(null)
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Pagos</h1>
        <p className="text-gray-600 mt-1">
          Realiza tus pagos de mantenimiento, cuotas especiales y multas de
          forma segura
        </p>
      </div>

      {/* Payment Items Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Conceptos Disponibles para Pago
        </h2>
        {!paymentsEnabled && (
          <Card className="p-6 mb-4 border-yellow-300 bg-yellow-50">
            <p className="text-yellow-800 text-center">
              Los pagos en línea aún no están habilitados para este
              fraccionamiento. Contacta a tu administrador.
            </p>
          </Card>
        )}
        {items.length === 0 ? (
          <Card className="p-6">
            <p className="text-gray-600 text-center">
              No hay conceptos de pago disponibles en este momento
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="p-6 flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {getPaymentTypeLabel(item.payment_type)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {item.description}
                    </p>
                  )}
                  <div className="text-2xl font-bold text-green-600 mb-4">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
                <Button
                  onClick={() => handlePayment(item.id)}
                  disabled={loading !== null || !paymentsEnabled}
                  className="w-full"
                >
                  {loading === item.id ? 'Procesando...' : 'Pagar'}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment History Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Historial de Pagos</h2>
        {history.length === 0 ? (
          <Card className="p-6">
            <p className="text-gray-600 text-center">
              No has realizado ningún pago todavía
            </p>
          </Card>
        ) : (
          <>
            {/* Stacked cards on phones — the 6-column table only scrolls sideways there */}
            <div className="space-y-3 md:hidden">
              {history.map((payment) => (
                <Card key={payment.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium min-w-0 break-words">
                      {payment.description ??
                        getPaymentTypeLabel(payment.payment_type)}
                    </p>
                    <span className="shrink-0">
                      {getStatusBadge(payment.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-600">
                      {new Date(payment.created_at).toLocaleDateString(
                        'es-MX',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        },
                      )}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                  {payment.receipt_url && (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver recibo
                    </a>
                  )}
                </Card>
              ))}
            </div>

            <div className="hidden md:block">
              <DataTable
                data={history}
                columns={[
                  {
                    key: 'created_at',
                    label: 'Fecha',
                    render: (value: string) =>
                      new Date(value).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }),
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
                          className="text-blue-600 hover:underline"
                        >
                          Ver recibo
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      ),
                  },
                ]}
                striped
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
