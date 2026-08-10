import type { QueryData, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'

/** Typed client — lets PostgREST infer the embedded `houses`/`tenants` shapes. */
type Db = SupabaseClient<Database>

export const getInviteQuery = (supabase: SupabaseClient, token: string) =>
  supabase
    .from('invites')
    .select(
      'id, email, name, expires_at, tenant_id, house_owner, house_id, is_admin, role, tenants (name)',
    )
    .eq('id', token)
    .single()

export type GetInviteQueryResult = QueryData<ReturnType<typeof getInviteQuery>>

/** Pending invites for one tenant — the admin-facing list. */
export const getTenantInvitesQuery = (supabase: Db, tenantId: string) =>
  supabase
    .from('invites')
    .select(
      'id, email, name, role, is_admin, house_owner, expires_at, created_at, houses (name)',
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

export type GetTenantInvitesQueryResult = QueryData<
  ReturnType<typeof getTenantInvitesQuery>
>

/** Every pending invite across every tenant — superadmin only. */
export const getAllInvitesQuery = (supabase: Db) =>
  supabase
    .from('invites')
    .select(
      'id, email, name, role, is_admin, house_owner, expires_at, created_at, tenant_id, tenants (name), houses (name)',
    )
    .order('created_at', { ascending: false })

export type GetAllInvitesQueryResult = QueryData<
  ReturnType<typeof getAllInvitesQuery>
>
