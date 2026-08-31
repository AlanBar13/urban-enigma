import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { requireSuperadmin } from './admin-users'
import { logger } from '@/utils/logger'

/** Superadmin-only: access is gated by the `/admin` route's beforeLoad. */
export const getContactRequestsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { data, error } = await getSupabaseClient()
      .from('contact_requests')
      .select('id, name, email, phone, fraccionamiento, plan, created_at')
      .order('created_at', { ascending: false })
    if (error) {
      logger('error', 'Error fetching contact requests:', { error })
      throw error
    }
    return data
  },
)

/** Superadmin-only: clears a handled access request. */
export const deleteContactRequestFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSuperadmin()

    const { error } = await getSupabaseClient()
      .from('contact_requests')
      .delete()
      .eq('id', data.id)
    if (error) {
      logger('error', 'Error deleting contact request:', { error })
      throw error
    }
    return { success: true }
  })

/** Public, unauthenticated endpoint — the landing page access request form. */
export const submitContactRequestFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).max(120),
      email: z.email().max(255),
      phone: z.string().trim().min(1).max(40),
      fraccionamiento: z.string().trim().min(1).max(160),
      // Plan que el visitante eligió en la sección de precios (si llegó por ahí)
      plan: z.string().trim().max(40).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { error } = await getSupabaseClient()
      .from('contact_requests')
      .insert(data)
    if (error) {
      logger('error', 'Error submitting contact request:', { error })
      throw error
    }
  })
