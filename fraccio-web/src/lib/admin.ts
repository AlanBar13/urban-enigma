import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { logger } from '@/utils/logger'

export interface DashboardStats {
    totalTenants: number
    totalUsers: number
    totalHouses: number
    totalAnnouncements: number
    recentTenants: Array<{ id: string; name: string; path: string; created_at: string }>
    recentUsers: Array<{ id: string; full_name: string; email: string; created_at: string }>
}

export const getDashboardStatsFn = createServerFn({ method: 'GET' })
    .handler(async (): Promise<DashboardStats> => {
        const supabase = getSupabaseClient()

        try {
            // Get total counts
            const [tenantsResult, usersResult, housesResult, announcementsResult] = await Promise.all([
                supabase.from('tenants').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('houses').select('*', { count: 'exact', head: true }),
                supabase.from('announcements').select('*', { count: 'exact', head: true })
            ])

            // Get recent tenants (last 5)
            const { data: recentTenants, error: tenantsError } = await supabase
                .from('tenants')
                .select('id, name, path, created_at')
                .order('created_at', { ascending: false })
                .limit(5)

            if (tenantsError) {
                logger('error', 'Error fetching recent tenants:', { error: tenantsError })
            }

            // Get recent users (last 5)
            const { data: recentUsers, error: usersError } = await supabase
                .from('profiles')
                .select('id, full_name, email, created_at')
                .order('created_at', { ascending: false })
                .limit(5)

            if (usersError) {
                logger('error', 'Error fetching recent users:', { error: usersError })
            }

            return {
                totalTenants: tenantsResult.count || 0,
                totalUsers: usersResult.count || 0,
                totalHouses: housesResult.count || 0,
                totalAnnouncements: announcementsResult.count || 0,
                recentTenants: recentTenants || [],
                recentUsers: recentUsers || []
            }
        } catch (error) {
            logger('error', 'Error fetching dashboard stats:', { error })
            throw error
        }
    })
