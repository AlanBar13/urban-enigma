import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { logger } from '@/utils/logger'

export interface TenantWithStats {
    id: string
    name: string
    path: string
    address: string | null
    created_at: string
    users_count: number
    houses_count: number
}

export const getTenantsWithStatsFn = createServerFn({ method: 'GET' })
    .handler(async (): Promise<TenantWithStats[]> => {
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
                        houses_count: housesCount || 0
                    }
                })
            )

            return tenantsWithStats
        } catch (error) {
            logger('error', 'Error fetching tenants with stats:', { error })
            throw error
        }
    })
