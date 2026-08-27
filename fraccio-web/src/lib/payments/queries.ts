import type { QueryData, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'

/** Typed client — lets PostgREST infer the embedded `houses` shape. */
type Db = SupabaseClient<Database>

const CHARGE_FIELDS =
  'id, description, payment_type, amount, currency, status, period, due_date, payment_method, proof_s3_key, review_note, reviewed_at, submitted_by, receipt_url, created_at, house_id, payment_item_id, houses (name)'

/**
 * Every charge in the tenant — powers the morosidad table and the review queue.
 * ponytail: whole ledger in one payload, filtered in the component. Add a
 * `period` bound here when a tenant has enough history for it to matter.
 */
export const getTenantChargesQuery = (supabase: Db, tenantId: string) =>
  supabase
    .from('payments')
    .select(CHARGE_FIELDS)
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: true, nullsFirst: false })

/** One house's charges — what a resident is allowed to see. */
export const getHouseChargesQuery = (supabase: Db, houseId: number) =>
  supabase
    .from('payments')
    .select(CHARGE_FIELDS)
    .eq('house_id', houseId)
    .order('due_date', { ascending: true, nullsFirst: false })

export type ChargeRow = QueryData<
  ReturnType<typeof getTenantChargesQuery>
>[number]

/** Charges awaiting an admin ruling on a resident's comprobante. */
export const getPendingReviewQuery = (supabase: Db, tenantId: string) =>
  supabase
    .from('payments')
    .select(CHARGE_FIELDS)
    .eq('tenant_id', tenantId)
    .eq('status', 'in_review')
    .order('created_at', { ascending: true })
