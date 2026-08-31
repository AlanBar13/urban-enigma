import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getUser } from './user'
import { assertAdmin, assertTenantAccess } from './auth'
import { backendFetch } from './backend'

/**
 * The fraccionamiento's own SaaS subscription — what it pays US every month.
 * Not to be confused with `stripe.ts`, which is Stripe Connect: residents
 * paying the fraccionamiento. All Stripe API calls live in the backend.
 */

export type SubscriptionStatus = {
  plan: string
  status: string | null
  houseCount: number
  feeMxn: number
  currentPeriodEnd: number | null
}

const tenantIdSchema = z.object({ tenantId: z.string().uuid() })

/** Admin only: Checkout session to subscribe to a paid plan. */
export const createSubscriptionCheckoutFn = createServerFn({ method: 'POST' })
  .inputValidator(
    tenantIdSchema.extend({ plan: z.enum(['basico', 'esencial', 'pro']) }),
  )
  .handler(async ({ data }) => {
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'subscribe to a plan')

    return backendFetch(
      `/api/v1/billing/tenants/${data.tenantId}/subscription`,
      {
        method: 'POST',
        body: JSON.stringify({ plan: data.plan }),
      },
    ) as Promise<{ url: string | null }>
  })

/** Admin only: Stripe's Billing Portal — cancel, change card, download invoices. */
export const createBillingPortalFn = createServerFn({ method: 'POST' })
  .inputValidator(tenantIdSchema)
  .handler(async ({ data }) => {
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'manage the subscription')

    return backendFetch(
      `/api/v1/billing/tenants/${data.tenantId}/subscription/portal`,
      { method: 'POST' },
    ) as Promise<{ url: string }>
  })

/** Admin only. Also re-syncs the billed house count backend-side. */
export const getSubscriptionStatusFn = createServerFn({ method: 'POST' })
  .inputValidator(tenantIdSchema)
  .handler(async ({ data }) => {
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'view the subscription')

    return backendFetch(
      `/api/v1/billing/tenants/${data.tenantId}/subscription`,
    ) as Promise<SubscriptionStatus>
  })
