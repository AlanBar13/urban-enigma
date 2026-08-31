import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import type { Json } from '@/database.types'
import { logger } from '@/utils/logger'

export type FeatureName = 'payments' | 'email' | 'visitors' | 'comprobante'

export type PlanName = 'arranque' | 'basico' | 'esencial' | 'pro'

export const PLAN_LABEL: Record<PlanName, string> = {
  arranque: 'Arranque',
  basico: 'Básico',
  esencial: 'Esencial',
  pro: 'Pro',
}

/**
 * Tope duro de casas por plan. Se aplica al crear una casa (`createHouseFn`),
 * que es el único lugar donde nacen. NO hay cobro por excedente: si el plan se
 * llena, se sube de plan.
 */
export const PLAN_MAX_HOUSES: Record<PlanName, number> = {
  arranque: 10,
  basico: 50,
  esencial: 200,
  pro: 400,
}

// La comisión por plan vive SÓLO en el backend (PLAN_FEE_MXN en
// billing.controller.ts) y llega a la UI vía getSubscriptionStatusFn. Duplicarla
// aquí sería una segunda fuente de verdad sobre dinero, que puede desalinearse.

/** Un plan que se cobra en línea (Arranque es gratis, no tiene suscripción). */
export const isPaidPlan = (
  plan: string,
): plan is 'basico' | 'esencial' | 'pro' =>
  plan === 'basico' || plan === 'esencial' || plan === 'pro'

/** El fraccionamiento debe dinero: avisar, pero nunca bloquear la app. */
export const isSubscriptionOverdue = (status: string | null): boolean =>
  status === 'past_due' || status === 'unpaid'

// Missing key = disabled: features must be explicitly enabled per tenant
export const isFeatureEnabled = (
  features: Json | null,
  feature: FeatureName,
): boolean => {
  const map = features as { [key: string]: Json | undefined } | null
  return map?.[feature] === true
}

const createTenantSchema = z.object({
  name: z.string().min(3),
  subdomain: z.string().min(3),
})

export const listTenantsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabase = getSupabaseClient()
    const { data: tenants, error } = await supabase.from('tenants').select('*')
    if (error) {
      logger('error', 'Error fetching tenants:', { error })
      throw error
    }
    return tenants
  },
)

/** Every tenant the current user may access — powers the header tenant switcher. */
export const listUserTenantsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabase = getSupabaseClient()
    const user = await getUser()

    const query = supabase.from('tenants').select('*')
    const { data: tenants, error } =
      user.role === 'superadmin'
        ? await query
        : await query.in('id', user.tenantIds)

    if (error) {
      logger('error', 'Error fetching user tenants:', { error })
      throw error
    }
    return tenants
  },
)

export const getTenantFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ path: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('path', data.path)
      .single()
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      logger('error', 'Error fetching tenant:', { error })
      throw error
    }
    return tenant
  })

export const getTenantByIdFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', data.id)
      .single()
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      logger('error', 'Error fetching tenant by ID:', { id: data.id, error })
      throw error
    }
    return tenant
  })

export const createTenantFn = createServerFn({ method: 'POST' })
  .inputValidator(createTenantSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        name: data.name,
        path: data.subdomain,
      })
      .select()
      .single()

    if (error) {
      logger('error', 'Error creating tenant:', { error })
      throw error
    }

    return tenant
  })
