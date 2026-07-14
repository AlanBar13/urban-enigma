import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { s3Service } from './s3'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { logger } from '@/utils/logger'

// Validation schemas
const getAnunciosSchema = z.object({
  tenantId: z.uuid(),
})

const getAdminAnunciosSchema = z.object({
  tenantId: z.uuid(),
})

// Types
export interface Announcement {
  id: number
  tenant_id: string
  title: string
  description: string | null
  owners_only: boolean
  interactions: number
  created_at: string
  attachment_s3_key: string | null
  attachment_mime_type: string | null
  attachment_name: string | null
}

export type AnnouncementWithUrl = Announcement & {
  attachment_url: string | null
}

/**
 * Attaches a viewable URL for each announcement's attachment
 * (presigned for owners-only, public otherwise)
 */
async function withAttachmentUrls(
  announcements: Array<Announcement>,
): Promise<Array<AnnouncementWithUrl>> {
  return Promise.all(
    announcements.map(async (announcement) => {
      if (!announcement.attachment_s3_key) {
        return { ...announcement, attachment_url: null }
      }
      try {
        const url = announcement.owners_only
          ? await s3Service.getPreSignedUrl(announcement.attachment_s3_key)
          : s3Service.getFileUrl(announcement.attachment_s3_key)
        return { ...announcement, attachment_url: url }
      } catch (error) {
        logger('error', 'Error getting announcement attachment URL', {
          announcementId: announcement.id,
          error,
        })
        return { ...announcement, attachment_url: null }
      }
    }),
  )
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
    if (user.tenantId !== data.tenantId && user.role !== 'superadmin') {
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

    const { data: announcements, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      logger('error', 'Error fetching announcements', { error })
      throw new Error('Failed to fetch announcements')
    }

    return withAttachmentUrls(announcements as Array<Announcement>)
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

    return withAttachmentUrls(announcements as Array<Announcement>)
  })
