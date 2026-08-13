import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from '../supabase'
import { getUser } from '../user'
import { assertTenantAccess, isAdmin, isGuard } from '../auth'
import { getUserHouse } from '../casa'
import {
  getHousePreferredQuery,
  getHouseVisitsQuery,
  getTenantPreferredQuery,
  getTenantVisitsQuery,
} from './queries'
import { logger } from '@/utils/logger'

/**
 * Unlike the rest of the app, guards are a real data boundary here: they see
 * every house's visitors while a resident sees only their own. Hidden nav is
 * not enough for that, so every fn below re-checks the role server side.
 */
async function getViewer(tenantId: string) {
  const user = await getUser()
  assertTenantAccess(user, tenantId)
  return { user, isStaff: isAdmin(user) || isGuard(user) }
}

/** How far back the gate list reaches. Residents keep their whole history. */
const STAFF_WINDOW_START = () =>
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

/** The caller's house, or a thrown error — visitors always belong to a house. */
async function requireHouseId(userId: string) {
  const { houseId } = await getUserHouse(getSupabaseClient(), userId)
  if (!houseId) {
    logger('error', 'User has no house assigned', { userId })
    throw new Error('No tienes una casa asignada')
  }
  return houseId
}

export const getVisitsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tenantId: z.uuid() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const { user, isStaff } = await getViewer(data.tenantId)

    if (isStaff) {
      const { data: visits, error } = await getTenantVisitsQuery(
        supabase,
        data.tenantId,
        STAFF_WINDOW_START(),
      )
      if (error) {
        logger('error', 'Error fetching tenant visits:', { error })
        throw error
      }
      return visits
    }

    const { houseId } = await getUserHouse(supabase, user.id)
    if (!houseId) return []

    const { data: visits, error } = await getHouseVisitsQuery(supabase, houseId)
    if (error) {
      logger('error', 'Error fetching house visits:', { error })
      throw error
    }
    return visits
  })

export const createVisitFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.uuid(),
      visitorName: z.string().min(1),
      expectedAt: z.iso.datetime(),
      expiresAt: z.iso.datetime().optional(),
      preferredVisitorId: z.uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getViewer(data.tenantId)

    if (data.expiresAt && data.expiresAt <= data.expectedAt) {
      throw new Error('La hora de fin debe ser posterior a la de llegada')
    }

    // house_id comes from the session, never from the client
    const houseId = await requireHouseId(user.id)

    const { data: visit, error } = await getSupabaseClient()
      .from('visits')
      .insert({
        tenant_id: data.tenantId,
        house_id: houseId,
        created_by: user.id,
        visitor_name: data.visitorName,
        expected_at: data.expectedAt,
        expires_at: data.expiresAt ?? null,
        preferred_visitor_id: data.preferredVisitorId ?? null,
      })
      .select('id')
      .single()

    if (error) {
      logger('error', 'Error creating visit:', { error })
      throw error
    }
    return visit
  })

/**
 * Loads a visit and throws unless the caller may act on it. `staffOnly` marks
 * the gate operations (check-in) that a resident must never reach.
 */
async function assertVisitAccess(visitId: string, staffOnly = false) {
  const supabase = getSupabaseClient()
  const { data: visit, error } = await supabase
    .from('visits')
    .select('id, tenant_id, house_id, visitor_name, checked_in_at')
    .eq('id', visitId)
    .single()

  if (error) {
    logger('error', 'Visit not found:', { error, visitId })
    throw new Error('Visita no encontrada')
  }

  const { user, isStaff } = await getViewer(visit.tenant_id)
  if (isStaff) return { visit, user }

  if (staffOnly) {
    logger('error', 'Non-staff attempted a gate operation', {
      userId: user.email,
      visitId,
    })
    throw new Error('Unauthorized: solo vigilancia puede registrar entradas')
  }

  const { houseId } = await getUserHouse(supabase, user.id)
  if (houseId !== visit.house_id) {
    logger('error', 'User does not own this visit', {
      userId: user.email,
      visitId,
    })
    throw new Error('Unauthorized')
  }
  return { visit, user }
}

export const cancelVisitFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ visitId: z.uuid() }))
  .handler(async ({ data }) => {
    const { visit } = await assertVisitAccess(data.visitId)

    // A checked-in visit is the access record for someone who actually came in
    if (visit.checked_in_at) {
      throw new Error('No se puede cancelar una visita que ya entró')
    }

    const { error } = await getSupabaseClient()
      .from('visits')
      .delete()
      .eq('id', data.visitId)

    if (error) {
      logger('error', 'Error cancelling visit:', { error })
      throw error
    }
    return { success: true }
  })

/** Gate arrival: guard verified the identity and (optionally) took the plate. */
export const checkInVisitFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      visitId: z.uuid(),
      plate: z.string().optional(),
      idVerified: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await assertVisitAccess(data.visitId, true)

    const { error } = await getSupabaseClient()
      .from('visits')
      .update({
        plate: data.plate?.trim() || null,
        id_verified: data.idVerified,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq('id', data.visitId)

    if (error) {
      logger('error', 'Error checking in visit:', { error })
      throw error
    }
    return { success: true }
  })

export const getPreferredVisitorsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tenantId: z.uuid() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const { user, isStaff } = await getViewer(data.tenantId)

    if (isStaff) {
      const { data: rows, error } = await getTenantPreferredQuery(
        supabase,
        data.tenantId,
      )
      if (error) {
        logger('error', 'Error fetching tenant preferred visitors:', { error })
        throw error
      }
      return rows
    }

    const { houseId } = await getUserHouse(supabase, user.id)
    if (!houseId) return []

    const { data: rows, error } = await getHousePreferredQuery(
      supabase,
      houseId,
    )
    if (error) {
      logger('error', 'Error fetching house preferred visitors:', { error })
      throw error
    }
    return rows
  })

export const createPreferredVisitorFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.uuid(),
      name: z.string().min(1),
      plate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getViewer(data.tenantId)
    const houseId = await requireHouseId(user.id)

    const { data: row, error } = await getSupabaseClient()
      .from('preferred_visitors')
      .insert({
        tenant_id: data.tenantId,
        house_id: houseId,
        created_by: user.id,
        name: data.name,
        plate: data.plate?.trim() || null,
      })
      .select('id')
      .single()

    if (error) {
      logger('error', 'Error creating preferred visitor:', { error })
      throw error
    }
    return row
  })

/** Same shape as `assertVisitAccess`, for the trusted-visitor list. */
async function assertPreferredAccess(preferredId: string, staffOnly = false) {
  const supabase = getSupabaseClient()
  const { data: preferred, error } = await supabase
    .from('preferred_visitors')
    .select('id, tenant_id, house_id, name, plate')
    .eq('id', preferredId)
    .single()

  if (error) {
    logger('error', 'Preferred visitor not found:', { error, preferredId })
    throw new Error('Visitante frecuente no encontrado')
  }

  const { user, isStaff } = await getViewer(preferred.tenant_id)
  if (isStaff) return { preferred, user }

  if (staffOnly) {
    logger('error', 'Non-staff attempted a gate operation', {
      userId: user.email,
      preferredId,
    })
    throw new Error('Unauthorized: solo vigilancia puede registrar entradas')
  }

  const { houseId } = await getUserHouse(supabase, user.id)
  if (houseId !== preferred.house_id) {
    logger('error', 'User does not own this preferred visitor', {
      userId: user.email,
      preferredId,
    })
    throw new Error('Unauthorized')
  }
  return { preferred, user }
}

export const deletePreferredVisitorFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ preferredVisitorId: z.uuid() }))
  .handler(async ({ data }) => {
    await assertPreferredAccess(data.preferredVisitorId)

    const { error } = await getSupabaseClient()
      .from('preferred_visitors')
      .delete()
      .eq('id', data.preferredVisitorId)

    if (error) {
      logger('error', 'Error deleting preferred visitor:', { error })
      throw error
    }
    return { success: true }
  })

/**
 * A trusted visitor needs no pre-registration, so their arrival has no row to
 * update — the guard's check-in *is* the entry, inserted already checked in.
 */
export const checkInPreferredFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      preferredVisitorId: z.uuid(),
      plate: z.string().optional(),
      idVerified: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { preferred, user } = await assertPreferredAccess(
      data.preferredVisitorId,
      true,
    )
    const now = new Date().toISOString()

    const { error } = await getSupabaseClient()
      .from('visits')
      .insert({
        tenant_id: preferred.tenant_id,
        house_id: preferred.house_id,
        created_by: user.id,
        visitor_name: preferred.name,
        expected_at: now,
        preferred_visitor_id: preferred.id,
        plate: data.plate?.trim() || preferred.plate,
        id_verified: data.idVerified,
        checked_in_at: now,
        checked_in_by: user.id,
      })

    if (error) {
      logger('error', 'Error checking in preferred visitor:', { error })
      throw error
    }
    return { success: true }
  })
