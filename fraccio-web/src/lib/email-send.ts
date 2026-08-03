import { backendFetch } from './backend'
import { logger } from '@/utils/logger'

// Server-only helpers. Never throw — an email failure must not fail
// invite or announcement creation (same contract as push-send.ts).
// Recipients are resolved by the backend from the DB, never sent from here.

/**
 * Emails the accept link for an existing invite via the backend Mailgun service.
 */
export async function sendInviteEmail(
  tenantId: string,
  inviteId: string,
): Promise<void> {
  try {
    await backendFetch(`/api/v1/email/tenants/${tenantId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ inviteId }),
    })
  } catch (error) {
    logger('error', 'Error sending invite email', { error, inviteId })
  }
}

/**
 * Emails an announcement to the tenant's users via the backend Mailgun service.
 * Returns false on failure so callers can surface an emailError flag.
 */
export async function sendAnnouncementEmail(
  tenantId: string,
  input: { title: string; description?: string; ownersOnly: boolean },
): Promise<boolean> {
  try {
    await backendFetch(`/api/v1/email/tenants/${tenantId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return true
  } catch (error) {
    logger('error', 'Error sending announcement email', { error, tenantId })
    return false
  }
}
