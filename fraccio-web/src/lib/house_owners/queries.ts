import { SupabaseClient } from "@supabase/supabase-js"


export const createHouseOwnerQuery = (supabase: SupabaseClient, houseId: number, userId: string) => supabase
    .from('house_owners')
    .insert({
        house_id: houseId,
        user_id: userId
    })
    .select()
