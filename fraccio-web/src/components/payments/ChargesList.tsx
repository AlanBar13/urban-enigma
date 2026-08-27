import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { AlertCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormModal } from '@/components/modals'
import { FormField, Select } from '@/components/forms'
import { useToast } from '@/components/notifications'
import { createCheckoutSessionFn } from '@/lib/stripe'
import { logger } from '@/utils/logger'

export interface Charge {
  id: number
  description: string | null
  amount: number
  status: string
  period: string | null
  due_date: string | null
  review_note: string | null
}

interface Props {
  tenantId: string
  tenantPath: string
  charges: Array<Charge>
  /** Card payment is only offered once the tenant finishes Stripe onboarding */
  paymentsEnabled: boolean
  /** `comprobante` feature toggle — when off, only card payment is offered */
  comprobanteEnabled: boolean
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    amount,
  )

/** "agosto 2026" from a `YYYY-MM-01` period. */
const formatPeriod = (period: string | null) =>
  period
    ? new Date(`${period}T00:00:00`).toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric',
      })
    : '—'

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

/** Vencido is derived, never stored: pending past its due date. */
export const isOverdue = (charge: Charge) =>
  charge.status === 'pending' &&
  !!charge.due_date &&
  new Date(`${charge.due_date}T23:59:59`) < new Date()

/**
 * The household's outstanding cuotas. A charge is the *house's* debt — it
 * exists before anyone pays — so any resident can settle it, by card or by
 * uploading proof of a transfer for the admin to approve.
 */
export default function ChargesList({
  tenantId,
  tenantPath,
  charges,
  paymentsEnabled,
  comprobanteEnabled,
}: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const createCheckoutSession = useServerFn(createCheckoutSessionFn)
  const [paying, setPaying] = useState<number | null>(null)
  const [proofFor, setProofFor] = useState<Charge | null>(null)
  const [method, setMethod] = useState<'transfer' | 'cash'>('transfer')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const open = charges.filter(
    (c) => c.status === 'pending' || c.status === 'in_review',
  )

  const handlePay = async (charge: Charge) => {
    setPaying(charge.id)
    try {
      const result = await createCheckoutSession({
        data: { tenantId, paymentId: charge.id },
      })
      if (result.url) window.location.href = result.url
    } catch (error: any) {
      logger('error', 'Error creating checkout session for charge:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al procesar el pago.',
        duration: 10000,
      })
      setPaying(null)
    }
  }

  const handleProof = async () => {
    if (!proofFor || !file) {
      addToast({
        type: 'error',
        description: 'Selecciona el comprobante',
        duration: 5000,
      })
      return
    }

    setUploading(true)
    const body = new FormData()
    body.append('paymentId', String(proofFor.id))
    body.append('method', method)
    body.append('file', file)
    body.append('tenantId', tenantId)
    body.append('tenantPath', tenantPath)

    try {
      const res = await fetch('/api/upload/comprobante', {
        method: 'POST',
        body,
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Error al enviar el comprobante')
      }
      addToast({
        type: 'success',
        description: 'Comprobante enviado. El administrador lo revisará.',
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error uploading comprobante:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al enviar el comprobante',
        duration: 10000,
      })
    } finally {
      setUploading(false)
      setProofFor(null)
      setFile(null)
      setMethod('transfer')
    }
  }

  if (open.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-600 text-center">
          No tienes cargos pendientes. Estás al corriente.
        </p>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {open.map((charge) => {
          const overdue = isOverdue(charge)
          const inReview = charge.status === 'in_review'
          return (
            <Card
              key={charge.id}
              className={`p-4 ${overdue ? 'border-red-300 bg-red-50' : ''}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {charge.description ?? 'Cargo'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatPeriod(charge.period)}
                    {charge.due_date &&
                      ` · vence ${formatDate(charge.due_date)}`}
                  </p>
                  {overdue && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-700">
                      <AlertCircle className="w-3 h-3" />
                      Vencido
                    </span>
                  )}
                  {inReview && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                      <Clock className="w-3 h-3" />
                      En revisión
                    </span>
                  )}
                  {charge.review_note && charge.status === 'pending' && (
                    <p className="mt-1 text-xs text-red-700">
                      Comprobante rechazado: {charge.review_note}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-bold tabular-nums">
                    {formatCurrency(charge.amount)}
                  </span>
                  {/* While in review the admin owns the next move */}
                  {!inReview && (
                    <>
                      <Button
                        onClick={() => handlePay(charge)}
                        disabled={paying !== null || !paymentsEnabled}
                      >
                        {paying === charge.id ? 'Procesando...' : 'Pagar'}
                      </Button>
                      {comprobanteEnabled && (
                        <Button
                          variant="outline"
                          onClick={() => setProofFor(charge)}
                        >
                          Ya pagué
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <FormModal
        open={comprobanteEnabled && !!proofFor}
        onOpenChange={(o) => !o && setProofFor(null)}
        title="Registrar pago realizado"
        description="Sube tu comprobante de transferencia o depósito. El administrador lo revisará antes de marcar el cargo como pagado."
        onSubmit={handleProof}
      >
        <FormField label="Método de pago">
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'transfer' | 'cash')}
          >
            <option value="transfer">Transferencia / SPEI</option>
            <option value="cash">Efectivo</option>
          </Select>
        </FormField>

        <FormField label="Comprobante (PDF o imagen, máx. 5MB)">
          <Input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            disabled={uploading}
          />
        </FormField>
      </FormModal>
    </>
  )
}
