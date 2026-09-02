import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import type { PlanName } from '@/lib/tenants'
import type { BillingInvoice } from '@/lib/billing'
import type { DataTableColumn } from '@/components/shared'
import {
  PLAN_LABEL,
  PLAN_MAX_HOUSES,
  PLAN_PRICE_MXN,
  isPaidPlan,
  isSubscriptionOverdue,
} from '@/lib/tenants'
import {
  createBillingPortalFn,
  createSubscriptionCheckoutFn,
  getBillingInvoicesFn,
  getSubscriptionStatusFn,
} from '@/lib/billing'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared'
import { useToast } from '@/components/notifications'
import { logger } from '@/utils/logger'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)

const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: 'Pagado',
  open: 'Pendiente',
  uncollectible: 'Incobrable',
  void: 'Anulado',
  draft: 'Borrador',
}

const invoiceColumns: Array<DataTableColumn<BillingInvoice>> = [
  {
    key: 'created',
    label: 'Fecha',
    render: (value: number) =>
      new Date(value * 1000).toLocaleDateString('es-MX'),
  },
  {
    key: 'number',
    label: 'Folio',
    render: (value: string | null) => value ?? '—',
  },
  { key: 'amountPaid', label: 'Monto', render: formatCurrency },
  {
    key: 'status',
    label: 'Estado',
    render: (value: string | null) =>
      value ? (INVOICE_STATUS_LABEL[value] ?? value) : '—',
  },
  {
    key: 'pdfUrl',
    label: 'Recibo',
    // El PDF es lo que la mayoría quiere; hostedUrl es la misma factura en web
    // y sirve de respaldo cuando Stripe todavía no generó el PDF.
    render: (_value, row) => {
      const href = row.pdfUrl ?? row.hostedUrl
      return href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Ver recibo
        </a>
      ) : (
        '—'
      )
    },
  },
]

/**
 * La suscripción del fraccionamiento con Fraccio. Deliberadamente FUERA del
 * toggle `payments`: ese toggle gobierna la cobranza a los colonos (Stripe
 * Connect), no lo que el fraccionamiento nos paga a nosotros. Vivía dentro de
 * /admin-pagos, donde un tenant con cobranza apagada no podía ni ver su plan.
 */
export const Route = createFileRoute('/$tenantId/suscripcion')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin' && context.user.role !== 'superadmin') {
      throw redirect({
        to: '/$tenantId',
        params: { tenantId: context.tenant.path },
      })
    }
  },
  loader: async ({ context }) => {
    // getSubscriptionStatusFn also re-syncs subscription_status from Stripe,
    // in case a webhook was missed
    const [subscription, invoices] = await Promise.all([
      getSubscriptionStatusFn({ data: { tenantId: context.tenant.id } }),
      getBillingInvoicesFn({ data: { tenantId: context.tenant.id } }),
    ])
    return { subscription, invoices }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { subscription, invoices } = Route.useLoaderData()
  const { addToast } = useToast()
  const createSubscriptionCheckout = useServerFn(createSubscriptionCheckoutFn)
  const createBillingPortal = useServerFn(createBillingPortalFn)
  const [billingBusy, setBillingBusy] = useState(false)
  const [upgradeTo, setUpgradeTo] = useState<'basico' | 'esencial' | 'pro'>(
    'basico',
  )

  const maxHouses = PLAN_MAX_HOUSES[subscription.plan as PlanName]

  /** Upgrade a un plan de paga, o el portal de Stripe si ya hay suscripción. */
  const handleBilling = async (plan?: 'basico' | 'esencial' | 'pro') => {
    setBillingBusy(true)
    try {
      const { url } = plan
        ? await createSubscriptionCheckout({
            data: { tenantId: tenant.id, plan },
          })
        : await createBillingPortal({ data: { tenantId: tenant.id } })
      if (url) window.location.href = url
    } catch (error: any) {
      logger('error', 'Error opening billing flow:', { error })
      addToast({
        type: 'error',
        description: 'No pudimos abrir la suscripción. Intenta de nuevo.',
        duration: 10000,
      })
      setBillingBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Suscripción</h1>
        <p className="text-gray-600 mt-1">
          El plan que el fraccionamiento tiene contratado con Fraccio
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Plan {PLAN_LABEL[subscription.plan as PlanName]}
            </h2>
            <p className="text-xl font-semibold mt-1">
              {subscription.monthlyMxn === null
                ? 'Sin mensualidad'
                : `${formatCurrency(subscription.monthlyMxn)} / mes`}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {subscription.houseCount} / {maxHouses} casas · comisión de{' '}
              {formatCurrency(subscription.feeMxn)} por pago recibido
              {subscription.currentPeriodEnd
                ? ` · se renueva el ${new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('es-MX')}`
                : ''}
            </p>
            {isPaidPlan(subscription.plan) && (
              <p className="text-gray-600 text-sm mt-1">
                Se cobra automáticamente a la tarjeta registrada. Cámbiala o
                cancela desde Administrar suscripción.
              </p>
            )}
            {subscription.houseCount >= maxHouses && (
              <p className="text-amber-700 text-sm mt-2 font-medium">
                Llegaste al límite de casas de tu plan. Sube de plan para
                registrar más casas (las que ya tienes no se ven afectadas).
              </p>
            )}
            {isSubscriptionOverdue(subscription.status) && (
              <p className="text-red-700 text-sm mt-2 font-medium">
                Hay un pago pendiente de tu suscripción. Actualiza tu método de
                pago para no perder el plan.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isPaidPlan(subscription.plan) ? (
              <Button
                variant="outline"
                onClick={() => handleBilling()}
                disabled={billingBusy}
              >
                {billingBusy ? 'Abriendo...' : 'Administrar suscripción'}
              </Button>
            ) : (
              // Un select en vez de un botón por plan: escala si algún día hay
              // más niveles, y no llena la tarjeta de botones.
              <>
                <select
                  className="h-9 rounded-md border bg-transparent px-3 text-sm"
                  value={upgradeTo}
                  onChange={(e) =>
                    setUpgradeTo(
                      e.target.value as 'basico' | 'esencial' | 'pro',
                    )
                  }
                >
                  {(['basico', 'esencial', 'pro'] as const).map((key) => (
                    <option key={key} value={key}>
                      {PLAN_LABEL[key]} — {formatCurrency(PLAN_PRICE_MXN[key])}{' '}
                      / mes · hasta {PLAN_MAX_HOUSES[key]} casas
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => handleBilling(upgradeTo)}
                  disabled={billingBusy}
                >
                  {billingBusy ? 'Abriendo...' : 'Contratar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Recibos</h2>
        <p className="text-gray-600 text-sm mt-1 mb-4">
          Los cobros de tu suscripción con Fraccio. Son comprobantes de pago, no
          facturas fiscales (CFDI).
        </p>
        {invoices.length === 0 ? (
          <p className="text-gray-600 text-sm">Todavía no hay recibos.</p>
        ) : (
          <DataTable columns={invoiceColumns} data={invoices} />
        )}
      </Card>
    </div>
  )
}
