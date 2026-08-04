import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { assertAdmin, assertTenantAccess } from './auth'
import { logger } from '@/utils/logger'

const createHouseInputSchema = z.object({
  tenantId: z.uuid(),
  name: z.string().min(3).max(30),
  address: z.string().min(5),
})

export const getHousesFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tenantId: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    const userData = await getUser()
    assertAdmin(userData)
    assertTenantAccess(userData, data.tenantId)

    const { data: houses, error } = await supabase
      .from('houses')
      .select('*')
      .eq('tenant_id', data.tenantId)

    if (error) {
      if (error.code === 'PGRST116') {
        return []
      }
      logger('error', 'Error fetching houses:', { error })
      throw error
    }
    return houses
  })

export const createHouseFn = createServerFn({ method: 'POST' })
  .inputValidator(createHouseInputSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    const userData = await getUser()
    assertAdmin(userData)
    assertTenantAccess(userData, data.tenantId)

    const { data: house, error } = await supabase
      .from('houses')
      .insert({
        tenant_id: data.tenantId,
        name: data.name,
        address: data.address,
      })
      .select()
      .single()

    if (error) {
      logger('error', 'Error creating house:', { error })
      throw error
    }

    return house
  })

export const deleteHouseFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tenantId: z.uuid(), houseId: z.number() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    const userData = await getUser()
    assertAdmin(userData)
    assertTenantAccess(userData, data.tenantId)

    // Payments must never be orphaned — refuse instead of cascading.
    const { data: payment } = await supabase
      .from('payments')
      .select('id')
      .eq('house_id', data.houseId)
      .limit(1)
      .maybeSingle()

    if (payment) {
      throw new Error('No se puede eliminar una casa con pagos registrados')
    }

    // ponytail: dependents deleted explicitly — the FK delete rules live in the
    // Supabase dashboard and aren't visible here, so we don't rely on cascade.
    for (const table of ['house_users', 'house_owners', 'invites'] as const) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('house_id', data.houseId)
      if (error) {
        logger('error', `Error deleting ${table} for house:`, { error })
        throw error
      }
    }

    const { error } = await supabase
      .from('houses')
      .delete()
      .eq('id', data.houseId)
      .eq('tenant_id', data.tenantId)

    if (error) {
      logger('error', 'Error deleting house:', { error })
      throw error
    }

    return { success: true }
  })
