import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import Stripe from 'stripe'

// Initialize Stripe with secret key
const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  })
}

// Validation schemas
const createCheckoutSessionSchema = z.object({
  paymentItemId: z.number(),
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
 * Creates a Stripe Checkout session for a payment item
 * Returns the checkout URL for redirect
 */
export const createCheckoutSessionFn = createServerFn({ method: 'POST' })
  .inputValidator(createCheckoutSessionSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const stripe = getStripeClient()

    // Get authenticated user
    const user = await getUser()
    if (!user) {
      logger('error', 'User not authenticated')
      throw new Error('User not authenticated')
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== data.tenantId) {
      logger('error', 'User does not belong to tenant', {
        userId: user.email,
        requestedTenant: data.tenantId,
        userTenant: user.tenantId,
      })
      throw new Error('Unauthorized: User does not belong to this tenant')
    }

    // Get payment item from database (never trust client for amounts)
    const { data: paymentItem, error: itemError } = await supabase
      .from('payment_items')
      .select('*')
      .eq('id', data.paymentItemId)
      .eq('tenant_id', data.tenantId)
      .eq('is_active', true)
      .single()

    if (itemError || !paymentItem) {
      logger('error', 'Payment item not found', { error: itemError })
      throw new Error('Payment item not found or inactive')
    }

    // Get user's house assignment
    const { data: houseUser, error: houseError } = await supabase
      .from('house_users')
      .select('house_id, houses(name, tenant_id, tenants(path))')
      .eq('user_id', user.id)
      .single()

    if (houseError || !houseUser) {
      logger('error', 'User has no assigned house', { userId: user.email })
      throw new Error('You must be assigned to a house to make payments')
    }

    // Verify house belongs to tenant
    const house = houseUser.houses as any
    if (house.tenant_id !== data.tenantId) {
      logger('error', 'House does not belong to tenant', {
        houseId: houseUser.house_id,
        houseTenant: house.tenant_id,
        requestedTenant: data.tenantId,
      })
      throw new Error('Unauthorized: House does not belong to this tenant')
    }

    // Create payment record with pending status
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: data.tenantId,
        user_id: user.id,
        house_id: houseUser.house_id,
        amount: paymentItem.amount,
        currency: paymentItem.currency,
        status: 'pending',
        payment_type: paymentItem.payment_type,
        description: paymentItem.description || paymentItem.name,
      })
      .select()
      .single()

    if (paymentError || !payment) {
      logger('error', 'Failed to create payment record', { error: paymentError })
      throw new Error('Failed to create payment record')
    }

    // Get base URL for redirects
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://fraccio.com' // Update with your production domain
      : 'http://localhost:3000'

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: "mxn", // For now only accept MXN currency
            product_data: {
              name: paymentItem.name,
              description: paymentItem.description || undefined,
            },
            unit_amount: Math.round(paymentItem.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/${houseUser.houses.tenants.path}/pagos/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${houseUser.houses.tenants.path}/pagos/cancel`,
      metadata: {
        payment_id: payment.id.toString(),
        tenant_id: data.tenantId,
        user_id: user.email!,
        house_id: houseUser.house_id.toString(),
      },
    })

    // Update payment record with Stripe session ID
    const { error: updateError } = await supabase
      .from('payments')
      .update({ stripe_session_id: session.id })
      .eq('id', payment.id)

    if (updateError) {
      logger('error', 'Failed to update payment with session ID', { error: updateError })
      // Don't throw here - session is created, we can still recover
    }

    logger('info', 'Checkout session created', {
      sessionId: session.id,
      paymentId: payment.id,
      amount: paymentItem.amount,
    })

    return {
      url: session.url,
      sessionId: session.id,
    }
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

    return payments as (Payment & { houses: { name: string } })[]
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

    return items as PaymentItem[]
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

    return payments as (Payment & {
      houses: { name: string }
      profiles: { full_name: string }
    })[]
  })
