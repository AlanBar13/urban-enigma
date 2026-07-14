import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { backendFetch } from './backend'
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
    if (!user) {
      logger('error', 'User not authenticated')
      throw new Error('User not authenticated')
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== data.tenantId && user.role !== 'superadmin') {
      logger('error', 'User does not belong to tenant')
      throw new Error('Unauthorized')
    }

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
    if (!user) {
      logger('error', 'User not authenticated')
      throw new Error('User not authenticated')
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== data.tenantId && user.role !== 'superadmin') {
      logger('error', 'User does not belong to tenant')
      throw new Error('Unauthorized')
    }

    // Fetch active payment items for the tenant
    const { data: items, error } = await supabase
      .from('payment_items')
      .select('*')
      .eq('tenant_id', data.tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

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
    if (!user) {
      logger('error', 'User not authenticated')
      throw new Error('User not authenticated')
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== data.tenantId) {
      logger('error', 'User does not belong to tenant')
      throw new Error('Unauthorized')
    }

    // Verify user is admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      logger('error', 'User is not authorized to create payment items', {
        userId: user.email,
        role: user.role,
      })
      throw new Error('Unauthorized: Admin access required')
    }

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

    return item as PaymentItem
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
    if (!user) {
      logger('error', 'User not authenticated')
      throw new Error('User not authenticated')
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== data.tenantId && user.role !== 'superadmin') {
      logger('error', 'User does not belong to tenant')
      throw new Error('Unauthorized')
    }

    // Verify user is admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      logger('error', 'User is not authorized to view all payments')
      throw new Error('Unauthorized: Admin access required')
    }

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
