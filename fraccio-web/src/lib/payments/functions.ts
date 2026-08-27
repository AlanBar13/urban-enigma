import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from '../supabase'
import { getUser } from '../user'
import { assertAdmin, assertTenantAccess } from '../auth'
import { getUserHouse } from '../casa'
import { sendPushToTenant } from '../push-send'
import { s3Service } from '../s3'
import { generateChargesForTenant, periodOf } from './charges'
import {
  getHouseChargesQuery,
  getPendingReviewQuery,
  getTenantChargesQuery,
} from './queries'
import { logger } from '@/utils/logger'

const formatMxn = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    amount,
  )

/** The caller's charges — always resolved from the session, never from the client. */
export const getHouseChargesFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tenantId: z.uuid() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)

    const { houseId } = await getUserHouse(supabase, user.id)
    if (!houseId) return []

    const { data: charges, error } = await getHouseChargesQuery(
      supabase,
      houseId,
    )
    if (error) {
      logger('error', 'Error fetching house charges', { error })
      throw new Error('Failed to fetch charges')
    }
    // A deactivated concepto stops being billable, so its open cargos disappear
    // from the resident's list (and its "Ya pagué" upload). Admins still see
    // them in the ledger and the review queue.
    return charges.filter((c) => c.payment_items?.is_active !== false)
  })

/** The whole tenant ledger — morosidad view. Admin only. */
export const getTenantChargesFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tenantId: z.uuid() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'view the tenant ledger')

    const { data: charges, error } = await getTenantChargesQuery(
      supabase,
      data.tenantId,
    )
    if (error) {
      logger('error', 'Error fetching tenant charges', { error })
      throw new Error('Failed to fetch charges')
    }
    return charges
  })

/**
 * Comprobantes are private S3 objects, so the admin's review queue needs a
 * short-lived link per row rather than a public URL.
 */
export const getPendingReviewFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tenantId: z.uuid() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'review payments')

    const { data: charges, error } = await getPendingReviewQuery(
      supabase,
      data.tenantId,
    )
    if (error) {
      logger('error', 'Error fetching review queue', { error })
      throw new Error('Failed to fetch review queue')
    }

    return Promise.all(
      charges.map(async (charge) => ({
        ...charge,
        proofUrl: charge.proof_s3_key
          ? await s3Service.getPreSignedUrl(charge.proof_s3_key)
          : null,
      })),
    )
  })

/**
 * Materializes this month's cuotas for every house (admin button).
 * Safe to press twice — the partial unique index makes re-runs a no-op.
 */
export const generateChargesFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.uuid(),
      // Optional so an admin can back-fill a month they enabled cuotas late for
      period: z.iso.date().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'generate charges')

    return generateChargesForTenant(
      supabase,
      data.tenantId,
      data.period ?? periodOf(),
    )
  })

/**
 * The admin's ruling on a resident-submitted comprobante.
 * Approve marks the charge paid and credits the submitter; reject sends it back
 * to `pending` with a note so the resident can see why and try again.
 */
export const reviewPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.uuid(),
      paymentId: z.number(),
      approve: z.boolean(),
      note: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'review payments')

    // Scoped to the tenant and to `in_review`, so a ruling can't be replayed on
    // an already-settled charge or reach across tenants.
    const { data: charge, error: loadError } = await supabase
      .from('payments')
      .select('id, amount, description, submitted_by')
      .eq('id', data.paymentId)
      .eq('tenant_id', data.tenantId)
      .eq('status', 'in_review')
      .single()

    // `.single()` errors when the row isn't there, isn't in this tenant, or
    // isn't in review — all three are the same refusal from the caller's side.
    if (loadError) {
      logger('error', 'Payment not found for review', {
        paymentId: data.paymentId,
        error: loadError,
      })
      throw new Error('El pago no está en revisión')
    }

    const { error } = await supabase
      .from('payments')
      .update({
        status: data.approve ? 'completed' : 'pending',
        // Credit whoever submitted the comprobante as the payer
        ...(data.approve ? { user_id: charge.submitted_by } : {}),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: data.note ?? null,
      })
      .eq('id', charge.id)

    if (error) {
      logger('error', 'Failed to review payment', { error })
      throw new Error('Failed to review payment')
    }

    if (charge.submitted_by) {
      await sendPushToTenant({
        tenantId: data.tenantId,
        title: data.approve ? 'Pago aprobado' : 'Pago rechazado',
        body: data.approve
          ? `${charge.description ?? 'Tu pago'} — ${formatMxn(charge.amount)}`
          : data.note || 'Revisa tu comprobante e inténtalo de nuevo.',
        path: 'pagos',
        userIds: [charge.submitted_by],
      })
    }

    return { success: true }
  })
