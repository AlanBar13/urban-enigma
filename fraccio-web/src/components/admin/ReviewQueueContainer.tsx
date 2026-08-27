import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FormModal } from '@/components/modals'
import { FormField } from '@/components/forms'
import { useToast } from '@/components/notifications'
import { reviewPaymentFn } from '@/lib/payments/functions'
import { logger } from '@/utils/logger'

export interface PendingReview {
  id: number
  description: string | null
  amount: number
  period: string | null
  payment_method: string
  created_at: string | null
  houses: { name: string } | null
  /** Short-lived S3 link — comprobantes are private objects */
  proofUrl: string | null
}

interface Props {
  tenantId: string
  charges: Array<PendingReview>
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    amount,
  )

const METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia / SPEI',
  cash: 'Efectivo',
  stripe: 'Tarjeta',
}

/**
 * Comprobantes waiting on an admin ruling. Approving is what actually moves
 * money into the "cobrado" number, so cash and SPEI stop being invisible.
 */
export default function ReviewQueueContainer({ tenantId, charges }: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const reviewPayment = useServerFn(reviewPaymentFn)
  const [busy, setBusy] = useState<number | null>(null)
  const [rejecting, setRejecting] = useState<PendingReview | null>(null)
  const [note, setNote] = useState('')

  const submit = async (
    charge: PendingReview,
    approve: boolean,
    reason?: string,
  ) => {
    setBusy(charge.id)
    try {
      await reviewPayment({
        data: {
          tenantId,
          paymentId: charge.id,
          approve,
          ...(reason ? { note: reason } : {}),
        },
      })
      addToast({
        type: 'success',
        description: approve ? 'Pago aprobado' : 'Comprobante rechazado',
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error reviewing payment:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al revisar el pago',
        duration: 10000,
      })
    } finally {
      setBusy(null)
    }
  }

  if (charges.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-600 text-center">
          No hay comprobantes por revisar
        </p>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {charges.map((charge) => (
          <Card key={charge.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium break-words">
                  {charge.houses?.name ?? 'Casa'} ·{' '}
                  {charge.description ?? 'Cargo'}
                </p>
                <p className="text-sm text-gray-600">
                  {METHOD_LABELS[charge.payment_method] ??
                    charge.payment_method}{' '}
                  {charge.created_at &&
                    ` · ${new Date(charge.created_at).toLocaleDateString(
                      'es-MX',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      },
                    )}`}
                </p>
                {charge.proofUrl ? (
                  <a
                    href={charge.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Ver comprobante
                  </a>
                ) : (
                  <span className="text-sm text-gray-400">Sin comprobante</span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-bold tabular-nums">
                  {formatCurrency(charge.amount)}
                </span>
                <Button
                  onClick={() => submit(charge, true)}
                  disabled={busy !== null}
                >
                  {busy === charge.id ? '...' : 'Aprobar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNote('')
                    setRejecting(charge)
                  }}
                  disabled={busy !== null}
                >
                  Rechazar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <FormModal
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Rechazar comprobante"
        description="El cargo vuelve a quedar pendiente y el residente recibe el motivo."
        onSubmit={async () => {
          if (rejecting)
            await submit(rejecting, false, note.trim() || undefined)
          setRejecting(null)
        }}
      >
        <FormField label="Motivo (lo verá el residente)">
          <Input
            placeholder="Ej: El comprobante no es legible"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>
      </FormModal>
    </>
  )
}
