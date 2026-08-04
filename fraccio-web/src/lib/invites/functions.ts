import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from '../supabase'
import { getInviteQuery } from './queries'
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
