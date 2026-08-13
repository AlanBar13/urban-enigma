import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getUser } from './user'
import { assertTenantAccess } from './auth'
import { sendInviteEmail } from './email-send'
import { logger } from '@/utils/logger'

// Validation schemas
const getUserHouseSchema = z.object({
  tenantId: z.uuid(),
})

const updateHouseSchema = z.object({
  houseId: z.number(),
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
})

const addHouseUserSchema = z.object({
  houseId: z.number(),
  email: z.email(),
  name: z.string().min(1, 'Name is required'),
})

const removeHouseUserSchema = z.object({
  houseId: z.number(),
  userId: z.uuid(),
})

/**
 * The house a user belongs to — as owner first, else as resident.
 * Shared with the visitas server fns, which must derive `house_id` from the
 * session and never take it from the client.
 */
export async function getUserHouse(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
): Promise<{ houseId: number | null; isOwner: boolean }> {
  const { data: ownerRecord } = await supabase
    .from('house_owners')
    .select('house_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (ownerRecord) return { houseId: ownerRecord.house_id, isOwner: true }

  const { data: residentRecord } = await supabase
    .from('house_users')
    .select('house_id')
    .eq('user_id', userId)
    .maybeSingle()

  return { houseId: residentRecord?.house_id ?? null, isOwner: false }
}

// Types
interface House {
  id: number
  name: string
  address: string
  max_habitants: number
  tenant_id: string
  created_at: string
}

interface HouseUser {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface UserHouseData {
  house: House | null
  users: Array<HouseUser>
  isOwner: boolean
}

/**
 * Gets the current user's house and all associated users
 */
export const getUserHouseFn = createServerFn({ method: 'POST' })
  .inputValidator(getUserHouseSchema)
  .handler(async ({ data }): Promise<UserHouseData> => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()
    assertTenantAccess(user, data.tenantId)

    const { houseId, isOwner } = await getUserHouse(supabase, user.id)

    if (!houseId) {
      return {
        house: null,
        users: [],
        isOwner: false,
      }
    }

    // Fetch house details
    const { data: house, error: houseError } = await supabase
      .from('houses')
      .select('*')
      .eq('id', houseId)
      .single()

    if (houseError) {
      logger('error', 'Error fetching house', { error: houseError })
      throw new Error('Failed to fetch house')
    }

    // Fetch all users for this house
    const { data: houseUserRecords, error: houseUsersError } = await supabase
      .from('house_users')
      .select('user_id')
      .eq('house_id', houseId)

    if (houseUsersError) {
      logger('error', 'Error fetching house users', { error: houseUsersError })
      throw new Error('Failed to fetch house users')
    }

    // Get profile information for all users
    const userIds = houseUserRecords.map((record) => record.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .in('id', userIds)

    if (profilesError) {
      logger('error', 'Error fetching profiles', { error: profilesError })
      throw new Error('Failed to fetch user profiles')
    }

    return {
      house: house as House,
      users: profiles as Array<HouseUser>,
      isOwner,
    }
  })

/**
 * Updates house information (owner only)
 */
export const updateHouseFn = createServerFn({ method: 'POST' })
  .inputValidator(updateHouseSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()

    // Verify user is the house owner
    const { data: houseOwnerRecord } = await supabase
      .from('house_owners')
      .select('house_id')
      .eq('user_id', user.id)
      .eq('house_id', data.houseId)
      .maybeSingle()

    if (!houseOwnerRecord) {
      logger('error', 'User is not the house owner', {
        userId: user.email,
        houseId: data.houseId,
      })
      throw new Error(
        'Unauthorized: Only house owners can update house information',
      )
    }

    // Update house
    const { data: house, error } = await supabase
      .from('houses')
      .update({
        name: data.name,
        address: data.address,
      })
      .eq('id', data.houseId)
      .select()
      .single()

    if (error) {
      logger('error', 'Error updating house', { error })
      throw new Error('Failed to update house')
    }

    logger('info', 'House updated successfully', {
      houseId: data.houseId,
      name: data.name,
    })

    return house as House
  })

/**
 * Adds a new user to the house via invite (owner only)
 */
export const addHouseUserFn = createServerFn({ method: 'POST' })
  .inputValidator(addHouseUserSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()

    // Verify user is the house owner
    const { data: houseOwnerRecord } = await supabase
      .from('house_owners')
      .select('house_id')
      .eq('user_id', user.id)
      .eq('house_id', data.houseId)
      .maybeSingle()

    if (!houseOwnerRecord) {
      logger('error', 'User is not the house owner', {
        userId: user.email,
        houseId: data.houseId,
      })
      throw new Error('Unauthorized: Only house owners can add users')
    }

    // Check current user count
    const { data: currentUsers, error: countError } = await supabase
      .from('house_users')
      .select('id')
      .eq('house_id', data.houseId)

    if (countError) {
      logger('error', 'Error counting house users', { error: countError })
      throw new Error('Failed to check user count')
    }

    if (currentUsers.length >= 5) {
      logger('warn', 'House has reached maximum user limit', {
        houseId: data.houseId,
        currentCount: currentUsers.length,
      })
      throw new Error('Maximum user limit reached (5 users)')
    }

    // Check if user is already invited
    const { data: existingInvite } = await supabase
      .from('invites')
      .select('id')
      .eq('email', data.email)
      .eq('house_id', data.houseId)
      .maybeSingle()

    if (existingInvite) {
      logger('warn', 'User already invited to this house', {
        email: data.email,
        houseId: data.houseId,
      })
      throw new Error('User already has a pending invite for this house')
    }

    // Check if user is already in the house
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()

    if (existingProfile) {
      const { data: existingHouseUser } = await supabase
        .from('house_users')
        .select('id')
        .eq('user_id', existingProfile.id)
        .eq('house_id', data.houseId)
        .maybeSingle()

      if (existingHouseUser) {
        logger('warn', 'User is already in this house', {
          email: data.email,
          houseId: data.houseId,
        })
        throw new Error('User is already in this house')
      }
    }

    // Get house tenant_id
    const { data: house } = await supabase
      .from('houses')
      .select('tenant_id')
      .eq('id', data.houseId)
      .single()

    if (!house) {
      throw new Error('House not found')
    }

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        email: data.email,
        tenant_id: house.tenant_id,
        house_id: data.houseId,
        house_owner: false,
        name: data.name,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // Expires in 7 days
      })
      .select()
      .single()

    if (inviteError) {
      logger('error', 'Error creating invite', { error: inviteError })
      throw new Error('Failed to create invite')
    }

    logger('info', 'User invited to house', {
      email: data.email,
      houseId: data.houseId,
      inviteId: invite.id,
    })

    await sendInviteEmail(house.tenant_id, invite.id)

    return invite
  })

/**
 * Removes a user from the house (owner only)
 */
export const removeHouseUserFn = createServerFn({ method: 'POST' })
  .inputValidator(removeHouseUserSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    // Get authenticated user
    const user = await getUser()

    // Verify user is the house owner
    const { data: houseOwnerRecord } = await supabase
      .from('house_owners')
      .select('house_id')
      .eq('user_id', user.id)
      .eq('house_id', data.houseId)
      .maybeSingle()

    if (!houseOwnerRecord) {
      logger('error', 'User is not the house owner', {
        userId: user.email,
        houseId: data.houseId,
      })
      throw new Error('Unauthorized: Only house owners can remove users')
    }

    // Prevent owner from removing themselves
    if (data.userId === user.id) {
      logger('warn', 'House owner tried to remove themselves', {
        userId: user.email,
        houseId: data.houseId,
      })
      throw new Error('Cannot remove yourself from the house')
    }

    // Check if user is the house owner (can't remove owner)
    const { data: targetIsOwner } = await supabase
      .from('house_owners')
      .select('user_id')
      .eq('user_id', data.userId)
      .eq('house_id', data.houseId)
      .maybeSingle()

    if (targetIsOwner) {
      logger('warn', 'Attempted to remove house owner', {
        targetUserId: data.userId,
        houseId: data.houseId,
      })
      throw new Error('Cannot remove the house owner')
    }

    // Remove user from house
    const { error } = await supabase
      .from('house_users')
      .delete()
      .eq('user_id', data.userId)
      .eq('house_id', data.houseId)

    if (error) {
      logger('error', 'Error removing user from house', { error })
      throw new Error('Failed to remove user from house')
    }

    logger('info', 'User removed from house', {
      userId: data.userId,
      houseId: data.houseId,
    })

    return { success: true }
  })
