import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSuperadmin } from './admin-users'
import { backendFetch } from './backend'

/**
 * Fraccio's own revenue — what fraccionamientos pay US, not what residents pay
 * them. All Stripe access lives in the backend; this is a thin wrapper.
 */

export interface TenantRevenue {
  tenantId: string | null
  name: string
  plan: string | null
  subscriptions: number
  commissions: number
  total: number
  paymentsCount: number
}

export interface MonthlyRevenue {
  month: string
  totals: { subscriptions: number; commissions: number; total: number }
  tenants: Array<TenantRevenue>
}

/** Superadmin only — the backend enforces this too; both guards are deliberate. */
export const getMonthlyRevenueFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }),
  )
  .handler(async ({ data }) => {
    await requireSuperadmin()

    return backendFetch(
      `/api/v1/admin/revenue?month=${data.month}`,
    ) as Promise<MonthlyRevenue>
  })
