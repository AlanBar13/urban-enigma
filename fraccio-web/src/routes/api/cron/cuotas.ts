import { createFileRoute } from '@tanstack/react-router'
import type { ChargeLike } from '@/lib/payments/charges'
import { getServiceSupabaseClient } from '@/lib/supabase'
import { isFeatureEnabled } from '@/lib/tenants'
import { sendPushToTenant } from '@/lib/push-send'
import {
  generateChargesForTenant,
  periodOf,
  selectReminders,
} from '@/lib/payments/charges'
import { logger } from '@/utils/logger'

/**
 * Daily cobranza sweep (Vercel cron, see vercel.json).
 *
 * 1. Materializes the current period's cuotas — idempotent, so running it every
 *    morning costs nothing and a tenant enabled mid-month is picked up next day.
 * 2. Pushes reminders for charges due in 3 days, due today, or overdue.
 *
 * Runs with the service client: there is no session here, and under RLS every
 * read would come back empty.
 */
export const Route = createFileRoute('/api/cron/cuotas')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET
        if (!secret) {
          logger('error', 'CRON_SECRET is not configured; refusing to run')
          return new Response(JSON.stringify({ error: 'Not configured' }), {
            status: 500,
          })
        }
        // Vercel Cron sends this header automatically. Without the check the
        // route is a public endpoint that mutates the ledger.
        if (request.headers.get('authorization') !== `Bearer ${secret}`) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
          })
        }

        const supabase = getServiceSupabaseClient()
        const period = periodOf()

        const { data: tenants, error } = await supabase
          .from('tenants')
          .select('id, path, features')
        if (error) {
          logger('error', 'Cron: failed to list tenants', { error })
          return new Response(JSON.stringify({ error: 'Failed' }), {
            status: 500,
          })
        }

        const summary: Array<{
          tenantId: string
          created: number
          reminded: number
        }> = []

        for (const tenant of tenants.filter((t) =>
          isFeatureEnabled(t.features, 'payments'),
        )) {
          try {
            const { created } = await generateChargesForTenant(
              supabase,
              tenant.id,
              period,
            )

            const reminded = await sendReminders(supabase, tenant.id)
            summary.push({ tenantId: tenant.id, created, reminded })
          } catch (tenantError) {
            // One tenant's bad data must not stop the sweep for the rest
            logger('error', 'Cron: tenant sweep failed', {
              tenantId: tenant.id,
              error: tenantError,
            })
          }
        }

        return new Response(JSON.stringify({ period, summary }), {
          status: 200,
        })
      },
    },
  },
})

const MESSAGES = {
  dueSoon: (n: number) => `Tienes ${n} cargo(s) que vencen en 3 días.`,
  dueToday: (n: number) => `Tienes ${n} cargo(s) que vencen hoy.`,
  overdue: (n: number) => `Tienes ${n} cargo(s) vencidos.`,
} as const

const TITLES = {
  dueSoon: 'Recordatorio de pago',
  dueToday: 'Tu cuota vence hoy',
  overdue: 'Tienes pagos vencidos',
} as const

/**
 * Pushes one notification per resident per bucket, then stamps
 * `last_reminder_at` — the stamp is what stops a daily cron from sending a
 * daily notification until everyone mutes push.
 */
async function sendReminders(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  tenantId: string,
): Promise<number> {
  const { data: charges, error } = await supabase
    .from('payments')
    .select('id, due_date, status, last_reminder_at, house_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .not('due_date', 'is', null)

  if (error) {
    logger('error', 'Cron: failed to load charges for reminders', {
      tenantId,
      error,
    })
    return 0
  }

  const buckets = selectReminders(charges as Array<ChargeLike>)
  const byHouse = new Map(charges.map((c) => [c.id, c.house_id]))

  let stamped = 0

  for (const [kind, rows] of Object.entries(buckets) as Array<
    [keyof typeof MESSAGES, Array<ChargeLike>]
  >) {
    if (rows.length === 0) continue

    const houseIds = [...new Set(rows.map((r) => byHouse.get(r.id)!))]

    // Owners live in house_owners and are not necessarily in house_users (see
    // getUserHouse in lib/casa.ts) — and the owner is exactly who owes the
    // cuota, so reminding only house_users would skip the actual debtor.
    const [{ data: users }, { data: owners }] = await Promise.all([
      supabase
        .from('house_users')
        .select('user_id, house_id')
        .in('house_id', houseIds),
      supabase
        .from('house_owners')
        .select('user_id, house_id')
        .in('house_id', houseIds),
    ])

    const residents = [...(users ?? []), ...(owners ?? [])]
    if (residents.length === 0) continue

    // Count per resident so the message says "3 cargos", not one push per charge
    const perHouse = new Map<number, number>()
    for (const row of rows) {
      const houseId = byHouse.get(row.id)!
      perHouse.set(houseId, (perHouse.get(houseId) ?? 0) + 1)
    }

    await Promise.all(
      [...perHouse.entries()].map(([houseId, count]) => {
        // Deduped: a user listed as both owner and resident gets one push
        const userIds = [
          ...new Set(
            residents
              .filter((r) => r.house_id === houseId)
              .map((r) => r.user_id),
          ),
        ]
        if (userIds.length === 0) return undefined
        return sendPushToTenant({
          tenantId,
          title: TITLES[kind],
          body: MESSAGES[kind](count),
          path: 'pagos',
          userIds,
          client: supabase,
        })
      }),
    )

    const { error: stampError } = await supabase
      .from('payments')
      .update({ last_reminder_at: new Date().toISOString() })
      .in(
        'id',
        rows.map((r) => r.id),
      )
    if (stampError) {
      logger('error', 'Cron: failed to stamp last_reminder_at', {
        tenantId,
        error: stampError,
      })
    } else {
      stamped += rows.length
    }
  }

  return stamped
}
