import { QueryData, SupabaseClient } from "@supabase/supabase-js"


export const getInviteQuery = (supabase: SupabaseClient, token: string) => supabase
    .from('invites')
    .select('id, email, name, expires_at, tenant_id, house_owner, house_id, is_admin, tenants (name)')
    .eq('id', token)
    .single()

export type GetInviteQueryResult = QueryData<ReturnType<typeof getInviteQuery>>
