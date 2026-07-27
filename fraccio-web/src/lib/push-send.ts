import webpush from 'web-push'
import { getSupabaseClient } from './supabase'
import { logger } from '@/utils/logger'

// Kept out of push.ts so `web-push` (a Node-only package) never reaches the client
// bundle through components that import the subscription server functions.

interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

let vapidConfigured = false

/**
 * Configures web-push lazily so a missing key only breaks sending, not the whole app
 */
function configureVapid(): boolean {
  if (vapidConfigured) return true

  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    logger('error', 'VAPID keys are not configured; skipping push send')
    return false
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@fraccio.app',
    publicKey,
    privateKey,
  )
  vapidConfigured = true
  return true
}

/**
 * Sends a notification to every subscribed member of a tenant.
 * Server-only helper — never throws, so a push failure cannot fail its caller.
 *
 * ponytail: inline fan-out with Promise.allSettled. Move to the backend BullMQ queue
 * if a tenant ever grows past a few hundred subscriptions.
 */
export async function sendPushToTenant(options: {
  tenantId: string
  title: string
  body: string
  /** Path within the tenant workspace, e.g. 'anuncios' */
  path: string
  /** Mirrors announcements.owners_only — restricts delivery to house owners */
  ownersOnly?: boolean
}): Promise<void> {
  try {
    if (!configureVapid()) return

    const supabase = getSupabaseClient()

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('tenant_id', options.tenantId)

    if (error) {
      logger('error', 'Error loading push subscriptions', { error })
      return
    }

    let targets = subscriptions as Array<PushSubscriptionRow>
    if (targets.length === 0) return

    // Same visibility rule as getAnunciosFn: non-owners never see owners-only content
    if (options.ownersOnly) {
      const { data: owners } = await supabase
        .from('house_owners')
        .select('user_id')
        .in(
          'user_id',
          targets.map((t) => t.user_id),
        )

      const ownerIds = new Set((owners ?? []).map((o) => o.user_id))
      targets = targets.filter((t) => ownerIds.has(t.user_id))
      if (targets.length === 0) return
    }

    // Resolve the tenant slug so the notification can deep-link into the workspace
    const { data: tenant } = await supabase
      .from('tenants')
      .select('path')
      .eq('id', options.tenantId)
      .single()

    const payload = JSON.stringify({
      title: options.title,
      body: options.body,
      url: tenant ? `/${tenant.path}/${options.path}` : '/',
    })

    const results = await Promise.allSettled(
      targets.map((target) =>
        webpush.sendNotification(
          {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          payload,
        ),
      ),
    )

    // Drop endpoints the push service says are gone
    const staleIds = results.flatMap((result, i) => {
      if (result.status !== 'rejected') return []
      const statusCode = (result.reason as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) return [targets[i].id]
      logger('error', 'Push send failed', { statusCode, error: result.reason })
      return []
    })

    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds)
    }
  } catch (error) {
    logger('error', 'Unexpected error sending push notifications', { error })
  }
}
