import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { assertTenantAccess } from './auth'
import { logger } from '@/utils/logger'

// Validation schemas
const saveSubscriptionSchema = z.object({
  tenantId: z.string().uuid(),
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
})

const deleteSubscriptionSchema = z.object({
  endpoint: z.string().url(),
})

/**
 * Stores a browser push subscription for the current user
 */
export const savePushSubscriptionFn = createServerFn({ method: 'POST' })
  .inputValidator(saveSubscriptionSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        tenant_id: data.tenantId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      { onConflict: 'endpoint' },
    )

    if (error) {
      logger('error', 'Error saving push subscription', { error })
      throw new Error('Failed to save push subscription')
    }

    return { success: true }
  })

/**
 * Removes a push subscription belonging to the current user
 */
export const deletePushSubscriptionFn = createServerFn({ method: 'POST' })
  .inputValidator(deleteSubscriptionSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', data.endpoint)
      .eq('user_id', user.id)

    if (error) {
      logger('error', 'Error deleting push subscription', { error })
      throw new Error('Failed to delete push subscription')
    }

    return { success: true }
  })
