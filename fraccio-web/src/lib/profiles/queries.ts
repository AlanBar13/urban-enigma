import { QueryData, SupabaseClient } from "@supabase/supabase-js"


export const getTenantUsersQuery = (supabase: SupabaseClient, tenantId: string) => supabase
    .from('profiles')
    .select('id, full_name, email, house_owner, house_users (houses (name))')
    .eq('tenant_id', tenantId)

export type GetTenantUsersQueryResult = QueryData<ReturnType<typeof getTenantUsersQuery>>
