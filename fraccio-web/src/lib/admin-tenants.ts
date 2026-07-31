import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { requireSuperadmin } from './admin-users'
import type { Json } from '@/database.types'
import { logger } from '@/utils/logger'

export interface TenantWithStats {
  id: string
  name: string
  path: string
  address: string | null
  created_at: string
  features: Json
  users_count: number
  houses_count: number
}

export const setTenantFeatureFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.string(),
      feature: z.enum(['payments']),
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSuperadmin()
    const supabase = getSupabaseClient()

    const { data: row, error: readError } = await supabase
      .from('tenants')
      .select('features')
      .eq('id', data.tenantId)
      .single()

    if (readError) {
      logger('error', 'Error reading tenant features:', { error: readError })
      throw readError
    }

    const features = {
      ...(row.features as { [key: string]: Json | undefined }),
      [data.feature]: data.enabled,
    }

    const { error } = await supabase
      .from('tenants')
      .update({ features })
      .eq('id', data.tenantId)

    if (error) {
      logger('error', 'Error updating tenant features:', { error })
      throw error
    }

    return { features }
  })

export const getTenantsWithStatsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<TenantWithStats>> => {
    const supabase = getSupabaseClient()

    try {
      // Get all tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

      if (tenantsError) {
        logger('error', 'Error fetching tenants:', { error: tenantsError })
        throw tenantsError
      }

      // Get counts for each tenant
      const tenantsWithStats = await Promise.all(
        tenants.map(async (tenant) => {
          // Get users count
          const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)

          // Get houses count
          const { count: housesCount } = await supabase
            .from('houses')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)

          return {
            ...tenant,
            users_count: usersCount || 0,
            houses_count: housesCount || 0,
          }
        }),
      )

      return tenantsWithStats
    } catch (error) {
      logger('error', 'Error fetching tenants with stats:', { error })
      throw error
    }
  },
)
