import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'
import { logger } from '@/utils/logger'

type Db = SupabaseClient<Database>

/**
 * A *cargo* is a `payments` row that exists before anyone has paid: it belongs
 * to a house, carries a `period` and a `due_date`, and starts as `pending`.
 * "Vencido" is never stored — it is `pending` past `due_date`, derived at read
 * time so there is no state to drift.
 */

/** `YYYY-MM-01` for the month `date` falls in — the identity of a billing period. */
export function periodOf(date: Date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-01`
}

/**
 * Due date for a period. `dueDay` is constrained to 1–28 in the DB precisely so
 * this is a substitution and never has to clamp to a short February.
 */
export function dueDateFor(period: string, dueDay: number): string {
  return `${period.slice(0, 8)}${`${dueDay}`.padStart(2, '0')}`
}

/** Local calendar date as `YYYY-MM-DD` — `toISOString()` would shift the day in CDMX. */
function isoDate(date: Date): string {
  return `${periodOf(date).slice(0, 8)}${`${date.getDate()}`.padStart(2, '0')}`
}

/** Whole days from `due_date` to `today`; negative = not due yet. */
export function daysOverdue(dueDate: string, today: Date = new Date()): number {
  const due = Date.parse(`${dueDate}T00:00:00Z`)
  const now = Date.parse(`${isoDate(today)}T00:00:00Z`)
  return Math.round((now - due) / 86_400_000)
}

export interface GenerateResult {
  /** Charges actually inserted — re-runs on the same period report 0. */
  created: number
  /** Houses in the tenant, so a caller can tell "nothing to do" from "no houses". */
  houses: number
}

/**
 * Materializes one pending charge per house per active monthly item.
 *
 * Idempotent by the partial unique index on (house_id, payment_item_id, period)
 * — the daily cron re-runs this every morning and the conflict makes it a no-op.
 * That index is the whole safety mechanism against double billing; without it
 * this function bills every house again on every run.
 *
 * A plain helper, not a server function: both the cron (service client, no
 * session) and the admin's "Generar cuotas del mes" button call it.
 */
export async function generateChargesForTenant(
  supabase: Db,
  tenantId: string,
  period: string = periodOf(),
): Promise<GenerateResult> {
  const [
    { data: items, error: itemsError },
    { data: houses, error: housesError },
  ] = await Promise.all([
    supabase
      .from('payment_items')
      .select('id, amount, currency, name, description, payment_type, due_day')
      .eq('tenant_id', tenantId)
      .eq('recurrence', 'monthly')
      .eq('is_active', true),
    supabase.from('houses').select('id').eq('tenant_id', tenantId),
  ])

  if (itemsError || housesError) {
    logger('error', 'Failed to load charge generation inputs', {
      tenantId,
      error: itemsError ?? housesError,
    })
    throw new Error('Failed to generate charges')
  }

  // Both are non-null past the error check above
  if (items.length === 0 || houses.length === 0) {
    return { created: 0, houses: houses.length }
  }

  const rows = items.flatMap((item) =>
    houses.map((house) => ({
      tenant_id: tenantId,
      house_id: house.id,
      payment_item_id: item.id,
      // The debt is the house's; user_id is stamped when a person actually pays.
      user_id: null,
      amount: item.amount,
      currency: item.currency ?? 'mxn',
      status: 'pending',
      payment_type: item.payment_type,
      description: item.description || item.name,
      period,
      due_date: dueDateFor(period, item.due_day ?? 1),
    })),
  )

  const { data: inserted, error } = await supabase
    .from('payments')
    .upsert(rows, {
      onConflict: 'house_id,payment_item_id,period',
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) {
    logger('error', 'Failed to generate charges', { tenantId, period, error })
    throw new Error('Failed to generate charges')
  }

  logger('info', 'Charges generated', {
    tenantId,
    period,
    created: inserted.length,
  })

  return { created: inserted.length, houses: houses.length }
}

export interface ChargeLike {
  id: number
  due_date: string | null
  status: string
  last_reminder_at: string | null
}

/** Gap between reminders. Without it a daily cron nags daily and people mute push. */
const REMINDER_COOLDOWN_DAYS = 6

/**
 * Splits pending charges into the three nudges worth sending, skipping anything
 * reminded within the cooldown. Pure so the selection rules are testable without
 * a database — this is the logic that decides who gets pestered.
 */
export function selectReminders(
  charges: Array<ChargeLike>,
  today: Date = new Date(),
): {
  dueSoon: Array<ChargeLike>
  dueToday: Array<ChargeLike>
  overdue: Array<ChargeLike>
} {
  const dueSoon: Array<ChargeLike> = []
  const dueToday: Array<ChargeLike> = []
  const overdue: Array<ChargeLike> = []

  for (const charge of charges) {
    if (charge.status !== 'pending' || !charge.due_date) continue

    if (charge.last_reminder_at) {
      const since =
        (today.getTime() - Date.parse(charge.last_reminder_at)) / 86_400_000
      if (since < REMINDER_COOLDOWN_DAYS) continue
    }

    const days = daysOverdue(charge.due_date, today)
    if (days > 0) overdue.push(charge)
    else if (days === 0) dueToday.push(charge)
    else if (days === -3) dueSoon.push(charge)
  }

  return { dueSoon, dueToday, overdue }
}
