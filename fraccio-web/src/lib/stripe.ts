import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { assertAdmin, assertTenantAccess } from './auth'
import { getUserHouse } from './casa'
import { backendFetch } from './backend'
import { sendPushToTenant } from './push-send'
import { logger } from '@/utils/logger'

// Validation schemas
// Exactly one of the two: `paymentId` settles a generated cargo, `paymentItemId`
// pays a one-off concept. The backend rejects a body carrying neither.
const createCheckoutSessionSchema = z
  .object({
    tenantId: z.string().uuid(),
    paymentItemId: z.number().optional(),
    paymentId: z.number().optional(),
  })
  .refine((v) => v.paymentItemId !== undefined || v.paymentId !== undefined, {
    message: 'paymentItemId or paymentId is required',
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

const createPaymentItemSchema = z
  .object({
    tenantId: z.string().uuid(),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    amount: z.number().positive('Amount must be positive'),
    paymentType: z.enum(['maintenance', 'assessment', 'fine']),
    // Empty/omitted = visible to the whole tenant
    assignedUserIds: z.array(z.string().uuid()).optional(),
    recurrence: z.enum(['none', 'monthly']).default('none'),
    // 1–28 so every month has the day; the DB enforces the same range
    dueDay: z.number().int().min(1).max(28).optional(),
  })
  .refine((v) => v.recurrence !== 'monthly' || v.dueDay !== undefined, {
    message: 'Una cuota mensual necesita un día de vencimiento',
    path: ['dueDay'],
  })
  // A cuota is billed per house, so it cannot also be scoped to a list of users.
  // ponytail: no per-house amounts or exemptions — every house owes the same.
  // Add a `payment_item_houses` table when a tenant needs either.
  .refine((v) => v.recurrence !== 'monthly' || !v.assignedUserIds?.length, {
    message: 'Una cuota mensual aplica a todo el fraccionamiento',
    path: ['assignedUserIds'],
  })

const setPaymentItemAssigneesSchema = z.object({
  tenantId: z.string().uuid(),
  itemId: z.number(),
  assignedUserIds: z.array(z.string().uuid()),
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
  /** null = every member of the tenant; otherwise only these profile ids */
  assigned_user_ids: Array<string> | null
  /** 'monthly' items are billed to every house each period by the cron */
  recurrence: string
  /** Day of month a monthly cuota is due; null for one-off concepts */
  due_day: number | null
  created_at: string
}

interface Payment {
  id: number
  tenant_id: string
  /** null on a generated cargo nobody has paid yet — the house is the debtor */
  user_id: string | null
  house_id: number
  /** `YYYY-MM-01` of the billed month; null on one-off payments */
  period: string | null
  due_date: string | null
  payment_method: string
  /** null on rows created before the column existed */
  payment_item_id: number | null
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
      body: JSON.stringify({
        ...(data.paymentItemId !== undefined
          ? { paymentItemId: data.paymentItemId }
          : {}),
        ...(data.paymentId !== undefined ? { paymentId: data.paymentId } : {}),
      }),
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

    // House-scoped, not user-scoped: a cargo is the household's debt and its
    // user_id is null until someone settles it, so filtering by user_id would
    // hide the very rows this page exists to show.
    const { houseId } = await getUserHouse(supabase, user.id)
    if (!houseId) return []

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, houses(name)')
      .eq('house_id', houseId)
      .eq('tenant_id', data.tenantId)
      // Transactions only. Outstanding cargos are their own list (ChargesList),
      // and nothing is stored for a checkout that was never completed.
      .in('status', ['completed', 'failed'])
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
      // Unassigned items are tenant-wide; assigned ones only reach their targets.
      // The backend re-checks this at checkout — this filter is visibility only.
      // ponytail: uuid[] column, no join table. Move to `payment_item_targets`
      // if a target ever needs its own metadata (amount, due date, paid flag).
      query = query
        .eq('is_active', true)
        .or(`assigned_user_ids.is.null,assigned_user_ids.cs.{${user.id}}`)
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
        assigned_user_ids: data.assignedUserIds?.length
          ? data.assignedUserIds
          : null,
        recurrence: data.recurrence,
        due_day: data.recurrence === 'monthly' ? (data.dueDay ?? null) : null,
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
      ...(data.assignedUserIds?.length
        ? { userIds: data.assignedUserIds }
        : {}),
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
 * Replaces the list of users a payment item is assigned to (admin only).
 * An empty list means "visible to the whole tenant".
 */
export const setPaymentItemAssigneesFn = createServerFn({ method: 'POST' })
  .inputValidator(setPaymentItemAssigneesSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    const user = await getUser()
    assertTenantAccess(user, data.tenantId)
    assertAdmin(user, 'update payment items')

    const { error } = await supabase
      .from('payment_items')
      .update({
        assigned_user_ids: data.assignedUserIds.length
          ? data.assignedUserIds
          : null,
      })
      .eq('id', data.itemId)
      .eq('tenant_id', data.tenantId)

    if (error) {
      logger('error', 'Failed to update payment item assignees', { error })
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
      // FK named explicitly: payments has three profile FKs (user_id,
      // submitted_by, reviewed_by), so a bare `profiles` is ambiguous.
      // This column is "who paid".
      .select('*, houses(name), profiles!payments_user_id_fkey(full_name)')
      .eq('tenant_id', data.tenantId)
      // Transactions only — the outstanding ledger comes from getTenantChargesFn
      .in('status', ['completed', 'failed'])
      .order('created_at', { ascending: false })

    if (error) {
      logger('error', 'Failed to fetch admin payments', { error })
      throw new Error('Failed to fetch admin payments')
    }

    return payments as Array<
      Payment & {
        houses: { name: string }
        /** null on a generated cargo nobody has paid yet */
        profiles: { full_name: string } | null
      }
    >
  })
