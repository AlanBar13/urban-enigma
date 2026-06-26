import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { z } from 'zod'
import { logger } from '@/utils/logger'

// Validation schemas
const getAnunciosSchema = z.object({
  tenantId: z.uuid(),
})

const createAnuncioSchema = z.object({
  tenantId: z.uuid(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  ownersOnly: z.boolean(),
})

const getAdminAnunciosSchema = z.object({
  tenantId: z.uuid(),
})

// Types
interface Announcement {
  id: number
  tenant_id: string
  title: string
  description: string | null
  owners_only: boolean
  interactions: number
  created_at: string
}

/**
 * Gets announcements for regular users with visibility filtering
 * House owners see all announcements, non-owners see only public ones
 */
export const getAnunciosFn = createServerFn({ method: 'POST' })
  .inputValidator(getAnunciosSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()
    if (!user) {
      logger('error', 'User not authenticated')
      throw new Error('User not authenticated')
    }

    // Verify user belongs to the tenant
    if ((user.tenantId !== data.tenantId) && user.role !== 'superadmin') {
      logger('error', 'User does not belong to tenant', {
        userId: user.email,
        requestedTenant: data.tenantId,
        userTenant: user.tenantId,
      })
      throw new Error('Unauthorized: User does not belong to this tenant')
    }

    // Check if user is a house owner
    const { data: houseOwnerRecord } = await supabase
      .from('house_owners')
      .select('user_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    const isHouseOwner = !!houseOwnerRecord

    // Build query with conditional visibility filter
    let query = supabase
      .from('announcements')
      .select('*')
      .eq('tenant_id', data.tenantId)

    // Non-owners can only see public announcements
    if (!isHouseOwner) {
      query = query.eq('owners_only', false)
    }

    const { data: announcements, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger('error', 'Error fetching announcements', { error })
      throw new Error('Failed to fetch announcements')
    }

    return announcements as Announcement[]
  })

/**
 * Creates a new announcement (admin only)
 */
export const createAnuncioFn = createServerFn({ method: 'POST' })
  .inputValidator(createAnuncioSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()
    if (!user) {
      logger('error', 'User not authenticated')
      throw new Error('User not authenticated')
    }

    // Verify user is admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      logger('error', 'User is not authorized to create announcements', {
        userId: user.email,
        role: user.role,
      })
      throw new Error('Unauthorized: Only admins can create announcements')
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== data.tenantId) {
      logger('error', 'User does not belong to tenant', {
        userId: user.email,
        requestedTenant: data.tenantId,
        userTenant: user.tenantId,
      })
      throw new Error('Unauthorized: User does not belong to this tenant')
    }

    // Insert announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        tenant_id: data.tenantId,
        title: data.title,
        description: data.description || null,
        owners_only: data.ownersOnly,
        interactions: 0,
      })
      .select()
      .single()

    if (error) {
      logger('error', 'Error creating announcement', { error })
      throw new Error('Failed to create announcement')
    }

    logger('info', 'Announcement created successfully', {
      announcementId: announcement.id,
      title: data.title,
      ownersOnly: data.ownersOnly,
    })

    return announcement as Announcement
  })

/**
 * Gets all announcements for admin view (no filtering)
 */
export const getAdminAnunciosFn = createServerFn({ method: 'POST' })
  .inputValidator(getAdminAnunciosSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()
    if (!user) {
      logger('error', 'User not authenticated')
      throw new Error('User not authenticated')
    }

    // Verify user is admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      logger('error', 'User is not authorized to view admin announcements', {
        userId: user.email,
        role: user.role,
      })
      throw new Error('Unauthorized: Only admins can view all announcements')
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== data.tenantId) {
      logger('error', 'User does not belong to tenant', {
        userId: user.email,
        requestedTenant: data.tenantId,
        userTenant: user.tenantId,
      })
      throw new Error('Unauthorized: User does not belong to this tenant')
    }

    // Fetch all announcements (no filtering)
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('tenant_id', data.tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      logger('error', 'Error fetching admin announcements', { error })
      throw new Error('Failed to fetch announcements')
    }

    return announcements as Announcement[]
  })
