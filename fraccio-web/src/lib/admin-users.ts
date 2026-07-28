import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { logger } from '@/utils/logger'

export interface AdminUser {
  id: string
  full_name: string
  email: string
  role: string
  tenant_id: string | null
  created_at: string
  tenant_name?: string
  /** Extra tenants granted through `tenant_admins` (excludes the home tenant). */
  extra_tenants: Array<{ id: string; name: string }>
}

async function requireSuperadmin() {
  const user = await getUser()
  if (user.role !== 'superadmin') {
    logger('error', 'Superadmin access required', { userId: user.email })
    throw new Error('Unauthorized: Superadmin access required')
  }
  return user
}

export const getAllUsersFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<AdminUser>> => {
    await requireSuperadmin()
    const supabase = getSupabaseClient()

    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select(
          `
                    id,
                    full_name,
                    email,
                    role,
                    tenant_id,
                    created_at,
                    tenants!profiles_tenant_id_fkey (
                        name
                    ),
                    tenant_admins (
                        tenant_id,
                        tenants ( name )
                    )
                `,
        )
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
        tenant_name: user.tenants?.name || 'Sin asignar',
        extra_tenants: (user.tenant_admins ?? [])
          .filter((t: any) => t.tenant_id !== user.tenant_id)
          .map((t: any) => ({ id: t.tenant_id, name: t.tenants?.name ?? '' })),
      }))

      return mappedUsers
    } catch (error) {
      logger('error', 'Error fetching all users:', { error })
      throw error
    }
  },
)

/**
 * Replaces the set of extra tenants an admin can access. Superadmin only —
 * this grants cross-tenant access.
 */
export const setTenantAdminsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ userId: z.uuid(), tenantIds: z.array(z.uuid()) }))
  .handler(async ({ data }) => {
    await requireSuperadmin()
    const supabase = getSupabaseClient()

    // ponytail: full replace instead of diffing — the set is a handful of rows.
    const { error: deleteError } = await supabase
      .from('tenant_admins')
      .delete()
      .eq('user_id', data.userId)
    if (deleteError) {
      logger('error', 'Error clearing tenant admins:', { error: deleteError })
      throw deleteError
    }

    if (data.tenantIds.length === 0) return { error: false }

    const { error } = await supabase.from('tenant_admins').insert(
      data.tenantIds.map((tenantId) => ({
        user_id: data.userId,
        tenant_id: tenantId,
      })),
    )
    if (error) {
      logger('error', 'Error setting tenant admins:', { error })
      throw error
    }

    return { error: false }
  })
