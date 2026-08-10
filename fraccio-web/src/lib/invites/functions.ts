import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from '../supabase'
import { getUser } from '../user'
import { assertAdmin, assertTenantAccess } from '../auth'
import { requireSuperadmin } from '../admin-users'
import { sendInviteEmail } from '../email-send'
import {
  getAllInvitesQuery,
  getInviteQuery,
  getTenantInvitesQuery,
} from './queries'
import { logger } from '@/utils/logger'

export const getInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const { data: invite, error } = await getInviteQuery(
      getSupabaseClient(),
      data.token,
    )
    if (error) {
      if (error.code === 'PGRST116') {
        // No se encontró la invitación
        return null
      }
      logger('error', 'Error fetching invite:', { error })
      throw error
    }
    return invite
  })

/**
 * Deletes an *expired* invite. Called from unauthenticated contexts, so it
 * cannot require a session — scoping it to expired rows is what makes it safe
 * to call with a guessed id. Consumed invites are deleted by `signupFn`.
 */
export const removeInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', data.token)
      .lt('expires_at', new Date().toISOString())
    if (error) {
      logger('error', 'Error removing invite:', { error })
      throw error
    }
  })

export const getTenantInvitesFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tenantId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getUser()
    assertAdmin(user, 'ver invitaciones')
    assertTenantAccess(user, data.tenantId)

    const { data: invites, error } = await getTenantInvitesQuery(
      getSupabaseClient(),
      data.tenantId,
    )
    if (error) {
      logger('error', 'Error fetching tenant invites:', {
        error,
        tenantId: data.tenantId,
      })
      throw error
    }
    return invites
  })

export const getAllInvitesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSuperadmin()

    const { data: invites, error } =
      await getAllInvitesQuery(getSupabaseClient())
    if (error) {
      logger('error', 'Error fetching all invites:', { error })
      throw error
    }
    return invites
  },
)

/**
 * Loads an invite and throws unless the caller may act on it. Both mutations
 * below need the invite's `tenant_id` anyway, so the lookup and the guard are
 * the same round trip.
 */
async function assertInviteAccess(inviteId: string) {
  const supabase = getSupabaseClient()
  const { data: invite, error } = await supabase
    .from('invites')
    .select('id, email, tenant_id')
    .eq('id', inviteId)
    .single()

  if (error) {
    logger('error', 'Invite not found:', { error, inviteId })
    throw new Error('Invitación no encontrada')
  }

  const user = await getUser()
  assertAdmin(user, 'gestionar invitaciones')
  assertTenantAccess(user, invite.tenant_id)
  return invite
}

/**
 * Deletes a pending invite. Unlike `removeInviteFn` this is admin-guarded, so
 * it is not restricted to expired rows — revoking a live invite is the point.
 */
export const revokeInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ inviteId: z.uuid() }))
  .handler(async ({ data }) => {
    await assertInviteAccess(data.inviteId)

    const { error } = await getSupabaseClient()
      .from('invites')
      .delete()
      .eq('id', data.inviteId)

    if (error) {
      logger('error', 'Error revoking invite:', { error })
      throw error
    }
    return { success: true }
  })

/** Re-sends the invite email for an existing invite. */
export const resendInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ inviteId: z.uuid() }))
  .handler(async ({ data }) => {
    const invite = await assertInviteAccess(data.inviteId)
    // sendInviteEmail never throws — a failure is only visible in the logs.
    await sendInviteEmail(invite.tenant_id, invite.id)
    return { success: true, email: invite.email }
  })
