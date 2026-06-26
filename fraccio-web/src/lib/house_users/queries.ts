import { SupabaseClient } from "@supabase/supabase-js"


export const createHouseUserQuery = (supabase: SupabaseClient, houseId: number, userId: string) => supabase
    .from('house_users')
    .insert({
        house_id: houseId,
        user_id: userId
    })
    .select()