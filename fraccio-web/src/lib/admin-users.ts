import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { logger } from '@/utils/logger'

export interface AdminUser {
    id: string
    full_name: string
    email: string
    role: string
    tenant_id: string | null
    created_at: string
    tenant_name?: string
}

export const getAllUsersFn = createServerFn({ method: 'GET' })
    .handler(async (): Promise<AdminUser[]> => {
        const supabase = getSupabaseClient()

        try {
            const { data: users, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    email,
                    role,
                    tenant_id,
                    created_at,
                    tenants (
                        name
                    )
                `)
                .order('created_at', { ascending: false })

            if (error) {
                logger('error', 'Error fetching all users:', { error })
                throw error
            }

            // Map the response to include tenant name
            const mappedUsers = users.map((user: any) => ({
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                tenant_id: user.tenant_id,
                created_at: user.created_at,
                tenant_name: user.tenants?.name || 'Sin asignar'
            }))

            return mappedUsers
        } catch (error) {
            logger('error', 'Error fetching all users:', { error })
            throw error
        }
    })
