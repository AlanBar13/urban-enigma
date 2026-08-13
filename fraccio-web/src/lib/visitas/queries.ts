import type { QueryData, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'

/** Typed client — lets PostgREST infer the embedded `houses` shape. */
type Db = SupabaseClient<Database>

const VISIT_FIELDS =
  'id, visitor_name, expected_at, expires_at, plate, id_verified, checked_in_at, house_id, preferred_visitor_id, created_at, houses (name)'

/**
 * Every visit in the tenant — the guard/admin gate list.
 * ponytail: `since` keeps the gate page from growing without bound; the day
 * filter itself is client-side. Move it server-side if a tenant ever outgrows
 * a few months of rows in one payload.
 */
export const getTenantVisitsQuery = (
  supabase: Db,
  tenantId: string,
  since?: string,
) => {
  const query = supabase
    .from('visits')
    .select(VISIT_FIELDS)
    .eq('tenant_id', tenantId)
  return (since ? query.gte('expected_at', since) : query).order(
    'expected_at',
    { ascending: false },
  )
}

/** One house's visits — what a resident is allowed to see. */
export const getHouseVisitsQuery = (supabase: Db, houseId: number) =>
  supabase
    .from('visits')
    .select(VISIT_FIELDS)
    .eq('house_id', houseId)
    .order('expected_at', { ascending: false })

export type VisitRow = QueryData<
  ReturnType<typeof getTenantVisitsQuery>
>[number]

const PREFERRED_FIELDS = 'id, name, plate, house_id, created_at, houses (name)'

export const getTenantPreferredQuery = (supabase: Db, tenantId: string) =>
  supabase
    .from('preferred_visitors')
    .select(PREFERRED_FIELDS)
    .eq('tenant_id', tenantId)
    .order('name')

export const getHousePreferredQuery = (supabase: Db, houseId: number) =>
  supabase
    .from('preferred_visitors')
    .select(PREFERRED_FIELDS)
    .eq('house_id', houseId)
    .order('name')

export type PreferredVisitorRow = QueryData<
  ReturnType<typeof getTenantPreferredQuery>
>[number]
