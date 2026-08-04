import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { assertAdmin, assertTenantAccess } from './auth'
import { backendFetch } from './backend'
import { sendPushToTenant } from './push-send'
import { logger } from '@/utils/logger'

// Validation schemas
const createCheckoutSessionSchema = z.object({
  paymentItemId: z.number(),
  tenantId: z.string().uuid(),
})

const tenantIdSchema = z.object({
  tenantId: z.string().uuid(),
})

const getPaymentHistorySchema = z.object({
  tenantId: z.string().uuid(),
})

const getPaymentItemsSchema = z.object({
  tenantId: z.string().uuid(),
  // Admins need to see deactivated items to be able to reactivate them.
  includeInactive: z.boolean().default(false),
})

const createPaymentItemSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  paymentType: z.enum(['maintenance', 'assessment', 'fine']),
})

const getAdminPaymentsSchema = z.object({
  tenantId: z.string().uuid(),
})

// Types
interface PaymentItem {
  id: number
  tenant_id: string
  name: string
  description: string | null
  amount: number
  currency: string
  payment_type: string
  is_active: boolean
  created_at: string
}

interface Payment {
  id: number
  tenant_id: string
  user_id: string
  house_id: number
  amount: number
  currency: string
  status: string
  payment_type: string
  description: string | null
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Creates a Stripe Checkout session for a payment item (via the backend,
 * which charges the tenant's connected Stripe account directly)
 * Returns the checkout URL for redirect
 */
export const createCheckoutSessionFn = createServerFn({ method: 'POST' })
  .inputValidator(createCheckoutSessionSchema)
  .handler(async ({ data }) => {
    return backendFetch(`/api/v1/payments/tenants/${data.tenantId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ paymentItemId: data.paymentItemId }),
    }) as Promise<{ url: string | null; sessionId: string }>
  })

/**
 * Creates/continues the tenant's Stripe Connect onboarding (admin only)
 * Returns a single-use onboarding URL for redirect
 */
export const createStripeOnboardingLinkFn = createServerFn({ method: 'POST' })
  .inputValidator(tenantIdSchema)
  .handler(async ({ data }) => {
    return backendFetch(
      `/api/v1/payments/tenants/${data.tenantId}/stripe/account`,
      {
        method: 'POST',
      },
    ) as Promise<{ url: string }>
  })

/**
 * Gets the tenant's Stripe Connect onboarding status (admin only)
 */
export const getStripeAccountStatusFn = createServerFn({ method: 'POST' })
  .inputValidator(tenantIdSchema)
  .handler(async ({ data }) => {
    return backendFetch(
      `/api/v1/payments/tenants/${data.tenantId}/stripe/account`,
    ) as Promise<{
      hasAccount: boolean
      chargesEnabled: boolean
    }>
  })

/**
 * Gets payment history for the authenticated user
 */
export const getPaymentHistoryFn = createServerFn({ method: 'POST' })
  .inputValidator(getPaymentHistorySchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()

    assertTenantAccess(user, data.tenantId)

    // Fetch user's payment history
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, houses(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', data.tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      logger('error', 'Failed to fetch payment history', { error })
      throw new Error('Failed to fetch payment history')
    }

    return payments as Array<Payment & { houses: { name: string } }>
  })

/**
 * Gets active payment items for a tenant
 */
export const getPaymentItemsFn = createServerFn({ method: 'POST' })
  .inputValidator(getPaymentItemsSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()

    assertTenantAccess(user, data.tenantId)

    let query = supabase
      .from('payment_items')
      .select('*')
      .eq('tenant_id', data.tenantId)

    if (data.includeInactive) {
      assertAdmin(user, 'view inactive payment items')
    } else {
      query = query.eq('is_active', true)
    }

    const { data: items, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      logger('error', 'Failed to fetch payment items', { error })
      throw new Error('Failed to fetch payment items')
    }

    return items as Array<PaymentItem>
  })

/**
 * Creates a new payment item (admin only)
 */
export const createPaymentItemFn = createServerFn({ method: 'POST' })
  .inputValidator(createPaymentItemSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()

    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'create payment items')

    // Create payment item
    const { data: item, error } = await supabase
      .from('payment_items')
      .insert({
        tenant_id: data.tenantId,
        name: data.name,
        description: data.description || null,
        amount: data.amount,
        currency: 'mxn',
        payment_type: data.paymentType,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger('error', 'Failed to create payment item', { error })
      throw new Error('Failed to create payment item')
    }

    logger('info', 'Payment item created', {
      itemId: item.id,
      name: data.name,
      amount: data.amount,
    })

    // Notify residents; sendPushToTenant never throws
    await sendPushToTenant({
      tenantId: data.tenantId,
      title: 'Nuevo concepto de pago',
      body: `${data.name} — ${new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
      }).format(data.amount)}`,
      path: 'pagos',
    })

    return item as PaymentItem
  })

/**
 * Activates or deactivates a payment item (admin only). Deactivated items drop
 * out of `getPaymentItemsFn`, so past `payments` rows keep their meaning.
 */
export const setPaymentItemActiveFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.uuid(),
      itemId: z.number(),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'update payment items')

    const { error } = await supabase
      .from('payment_items')
      .update({ is_active: data.active })
      .eq('id', data.itemId)
      .eq('tenant_id', data.tenantId)

    if (error) {
      logger('error', 'Failed to update payment item state', { error })
      throw new Error('Failed to update payment item')
    }

    return { success: true }
  })

/**
 * Gets all payments for a tenant (admin only)
 */
export const getAdminPaymentsFn = createServerFn({ method: 'POST' })
  .inputValidator(getAdminPaymentsSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()

    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'view all payments')

    // Fetch all payments for the tenant
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, houses(name), profiles(full_name)')
      .eq('tenant_id', data.tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      logger('error', 'Failed to fetch admin payments', { error })
      throw new Error('Failed to fetch admin payments')
    }

    return payments as Array<
      Payment & {
        houses: { name: string }
        profiles: { full_name: string }
      }
    >
  })
