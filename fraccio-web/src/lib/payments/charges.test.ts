import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))

const {
  daysOverdue,
  dueDateFor,
  generateChargesForTenant,
  periodOf,
  selectReminders,
} = await import('./charges')

describe('periodOf', () => {
  it('is the first of the month the date falls in', () => {
    expect(periodOf(new Date(2026, 7, 24))).toBe('2026-08-01')
  })

  it('zero-pads single-digit months', () => {
    expect(periodOf(new Date(2026, 0, 31))).toBe('2026-01-01')
  })
})

describe('dueDateFor', () => {
  it('substitutes the due day into the period', () => {
    expect(dueDateFor('2026-08-01', 5)).toBe('2026-08-05')
    expect(dueDateFor('2026-08-01', 28)).toBe('2026-08-28')
  })

  // due_day is capped at 28 in the DB precisely so February never needs clamping
  it('produces a real date in February', () => {
    expect(dueDateFor('2026-02-01', 28)).toBe('2026-02-28')
  })
})

describe('daysOverdue', () => {
  const today = new Date(2026, 7, 10) // 10 Aug 2026

  it('is negative before the due date', () => {
    expect(daysOverdue('2026-08-13', today)).toBe(-3)
  })

  it('is zero on the due date', () => {
    expect(daysOverdue('2026-08-10', today)).toBe(0)
  })

  it('is positive after the due date', () => {
    expect(daysOverdue('2026-08-05', today)).toBe(5)
  })

  it('counts across a month boundary', () => {
    expect(daysOverdue('2026-07-31', today)).toBe(10)
  })
})

describe('selectReminders', () => {
  const today = new Date(2026, 7, 10)
  const charge = (
    over: Partial<Parameters<typeof selectReminders>[0][number]>,
  ) => ({
    id: 1,
    due_date: '2026-08-10',
    status: 'pending',
    last_reminder_at: null,
    ...over,
  })

  it('buckets by distance to the due date', () => {
    const { dueSoon, dueToday, overdue } = selectReminders(
      [
        charge({ id: 1, due_date: '2026-08-13' }),
        charge({ id: 2, due_date: '2026-08-10' }),
        charge({ id: 3, due_date: '2026-08-01' }),
      ],
      today,
    )
    expect(dueSoon.map((c) => c.id)).toEqual([1])
    expect(dueToday.map((c) => c.id)).toEqual([2])
    expect(overdue.map((c) => c.id)).toEqual([3])
  })

  it('ignores dates that are neither due, overdue, nor exactly 3 days out', () => {
    const { dueSoon, dueToday, overdue } = selectReminders(
      [charge({ due_date: '2026-08-20' })],
      today,
    )
    expect([...dueSoon, ...dueToday, ...overdue]).toEqual([])
  })

  it('skips charges that are not pending', () => {
    const { overdue } = selectReminders(
      [
        charge({ id: 1, due_date: '2026-08-01', status: 'completed' }),
        charge({ id: 2, due_date: '2026-08-01', status: 'in_review' }),
      ],
      today,
    )
    expect(overdue).toEqual([])
  })

  // The cooldown is the whole reason a daily cron isn't a daily notification
  it('skips charges reminded within the cooldown', () => {
    const { overdue } = selectReminders(
      [
        charge({
          id: 1,
          due_date: '2026-08-01',
          last_reminder_at: new Date(2026, 7, 8).toISOString(), // 2 days ago
        }),
      ],
      today,
    )
    expect(overdue).toEqual([])
  })

  it('reminds again once the cooldown has passed', () => {
    const { overdue } = selectReminders(
      [
        charge({
          id: 1,
          due_date: '2026-08-01',
          last_reminder_at: new Date(2026, 7, 3).toISOString(), // 7 days ago
        }),
      ],
      today,
    )
    expect(overdue.map((c) => c.id)).toEqual([1])
  })
})

describe('generateChargesForTenant', () => {
  let items: Array<Record<string, unknown>> = []
  let houses: Array<{ id: number }> = []
  let upserted: Array<Record<string, unknown>> = []
  let upsertOptions: Record<string, unknown> | undefined

  /** Charges already in the DB — the partial unique index makes these no-op. */
  let existing: Set<string> = new Set()

  const supabase = {
    from: (table: string) => {
      if (table === 'houses') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: houses, error: null }),
          }),
        }
      }
      if (table === 'payment_items') {
        const chain: Record<string, unknown> = {
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: items, error: null }).then(resolve),
        }
        chain.select = () => chain
        chain.eq = () => chain
        return chain
      }
      return {
        upsert: (
          rows: Array<Record<string, unknown>>,
          options: Record<string, unknown>,
        ) => {
          upsertOptions = options
          // Stand in for the unique index: only rows not already present land
          const fresh = rows.filter(
            (r) =>
              !existing.has(`${r.house_id}:${r.payment_item_id}:${r.period}`),
          )
          upserted = rows
          for (const r of fresh) {
            existing.add(`${r.house_id}:${r.payment_item_id}:${r.period}`)
          }
          return {
            select: () =>
              Promise.resolve({
                data: fresh.map((_, i) => ({ id: i + 1 })),
                error: null,
              }),
          }
        },
      }
    },
  }

  const run = (period = '2026-08-01') =>
    generateChargesForTenant(supabase as never, 't1', period)

  beforeEach(() => {
    items = [
      {
        id: 10,
        amount: 1200,
        currency: 'mxn',
        name: 'Cuota de mantenimiento',
        description: null,
        payment_type: 'maintenance',
        due_day: 5,
      },
    ]
    houses = [{ id: 1 }, { id: 2 }, { id: 3 }]
    upserted = []
    upsertOptions = undefined
    existing = new Set()
  })

  it('creates one charge per house', async () => {
    const result = await run()
    expect(result).toEqual({ created: 3, houses: 3 })
    expect(upserted).toHaveLength(3)
  })

  it('derives the due date from the item and leaves the debt unassigned', async () => {
    await run()
    expect(upserted[0]).toMatchObject({
      tenant_id: 't1',
      house_id: 1,
      payment_item_id: 10,
      amount: 1200,
      status: 'pending',
      period: '2026-08-01',
      due_date: '2026-08-05',
      // The house owes it; user_id is stamped only when someone pays
      user_id: null,
    })
  })

  // Load-bearing: the cron re-runs this every morning
  it('is idempotent across runs of the same period', async () => {
    await run()
    const second = await run()
    expect(second.created).toBe(0)
    expect(upsertOptions).toMatchObject({
      onConflict: 'house_id,payment_item_id,period',
      ignoreDuplicates: true,
    })
  })

  it('bills the next period separately', async () => {
    await run('2026-08-01')
    const september = await run('2026-09-01')
    expect(september.created).toBe(3)
  })

  it('does nothing when the tenant has no monthly items', async () => {
    items = []
    expect(await run()).toEqual({ created: 0, houses: 3 })
  })

  it('does nothing when the tenant has no houses', async () => {
    houses = []
    expect(await run()).toEqual({ created: 0, houses: 0 })
  })

  it('falls back to day 1 when a monthly item has no due day', async () => {
    items[0].due_day = null
    await run()
    expect(upserted[0]).toMatchObject({ due_date: '2026-08-01' })
  })
})
