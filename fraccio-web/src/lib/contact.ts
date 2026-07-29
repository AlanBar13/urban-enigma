import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { logger } from '@/utils/logger'

/** Public, unauthenticated endpoint — the landing page access request form. */
export const submitContactRequestFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).max(120),
      email: z.email().max(255),
      phone: z.string().trim().min(1).max(40),
      fraccionamiento: z.string().trim().min(1).max(160),
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
