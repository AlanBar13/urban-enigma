import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { createHouseOwnerQuery } from './house_owners/queries'
import { createHouseUserQuery } from './house_users/queries'
import { getTenantUsersQuery } from './profiles/queries'

const loginSchema = z.object({
    email: z.string(),
    password: z.string().min(6),
})

const signupSchema = z.object({
    email: z.email(),
    name: z.string(),
    password: z.string().min(6),
    tenantId: z.uuid(),
    inviteId: z.uuid(),
    houseId: z.number().optional(),
    houseOwner: z.boolean().default(false),
    is_admin: z.boolean().default(false)
})

const inviteUserSchema = z.object({
    email: z.email(),
    tenantId: z.uuid(),
    house_id: z.number().optional(),
    house_owner: z.boolean().optional(),
    name: z.string(),
    is_admin: z.boolean().default(false)
})

export const getUserSchema = z.object({
    id: z.uuid(),
    email: z.email().optional(),
    tenantId: z.uuid(),
    role: z.string(),
    full_name: z.string().nullable()
})

interface LoginData {
    error: boolean
    message: string
    tenantId?: string | null
    role?: string
}

export const getUser = createServerFn({ method: 'GET' })
    .handler(async () => {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.auth.getUser()
        if (error) {
            logger('error', 'Error fetching user:', { error })
            throw error
        }

        if (!data.user) {
            logger('error', 'Error fetching user:', { error })
            throw new Error('User not found')
        }
        const { data: profile, error: profileError } = await supabase.from('profiles').select("full_name, role, tenant_id").eq('id', data.user.id).single()
        if (!profile || profileError) {
            logger('error', 'Error fetching profile:', { error: profileError })
            throw new Error('Profile not found')
        }

        return {
            id: data.user.id,
            email: data.user.email,
            tenantId: profile.tenant_id,
            role: profile.role,
            full_name: profile.full_name
        }
    })

export const loginFn = createServerFn({ method: 'POST' })
    .inputValidator(loginSchema)
    .handler(async ({ data }): Promise<LoginData> => {
        const supabase = getSupabaseClient()
        const { data: auth, error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password
        })

        if (error) {
            logger('error', 'Error logging in:', { error })
            return {
                error: true,
                message: error.message
            }
        }

        if (!auth.user) {
            logger('error', 'Error logging in: User not found', { user: data.email })
            return {
                error: true,
                message: 'User not found'
            }
        }

        const { data: profile, error: profileError } = await supabase.from('profiles').select("role, tenant_id").eq('id', auth.user.id).single()
        if (!profile || profileError) {
            logger('error', 'Error fetching profile after login:', { error: profileError })
            return {
                error: true,
                message: 'Profile not found'
            }
        }


        return {
            error: false,
            message: 'User logged in',
            tenantId: profile.tenant_id || null,
            role: profile.role
        }
    })

export const signupFn = createServerFn({ method: 'POST' })
    .inputValidator(signupSchema)
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()

        const { error } = await supabase.auth.signOut();
        if (error) {
            logger('error', 'Error signing out before signup:', { error })
            throw error
        }

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    tenant_id: data.tenantId,
                    full_name: data.name,
                    role: "user",
                    house_owner: data.houseOwner
                }
            }
        })

        if (signupError) {
            logger('error', 'Error signing up:', { error: signupError })
            return {
                error: true,
                message: signupError.message
            }
        }

        if (signupData.user) {
            if (data.is_admin) {
                console.log('Setting user as admin')
                const { error: adminError } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', signupData.user.id)
                if (adminError) {
                    logger('error', 'Error setting user as admin:', { error: adminError })
                    return {
                        error: true,
                        message: adminError.message
                    }
                }
            }
            else {
                console.log('Setting user as regular user')
                if (data.houseId) {
                    if (data.houseOwner) {
                        const { error: houseOwnerError } = await createHouseOwnerQuery(supabase, data.houseId, signupData.user.id)
                        if (houseOwnerError) {
                            logger('error', 'Error creating house owner:', { error: houseOwnerError })
                            return {
                                error: true,
                                message: houseOwnerError.message
                            }
                        }
                    }

                    const { error: houseUserError } = await createHouseUserQuery(supabase, data.houseId, signupData.user.id)
                    if (houseUserError) {
                        logger('error', 'Error creating house user:', { error: houseUserError })
                        return {
                            error: true,
                            message: houseUserError.message
                        }
                    }
                }
            }
        }

        const { error: deleteInviteError } = await supabase.from('invites').delete().eq('id', data.inviteId)
        if (deleteInviteError) {
            logger('error', 'Error deleting invite:', { error: deleteInviteError })
        }

        return {
            error: false,
            message: 'User signed up'
        }
    })

export const logoutFn = createServerFn({ method: 'POST' })
    .handler(async () => {
        const supabase = await getSupabaseClient()
        const { error } = await supabase.auth.signOut();
        if (error) {
            logger('error', 'Error logging out:', { error })
            throw error
        }

        return { error: false, message: 'User logged out' }
    })

export const inviteUserFn = createServerFn({ method: 'POST' })
    .inputValidator(inviteUserSchema)
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()
        console.log('Inviting user with data:', data)

        const { data: existingInvite } = await supabase
            .from('invites')
            .select()
            .eq('email', data.email)
            .eq('tenant_id', data.tenantId)
            .single()

        if (existingInvite) {
            logger('warn', 'User already invited:', { email: data.email, tenantId: data.tenantId })
            return { error: true, message: 'User already invited' }
        }

        const { data: inviteData, error } = await supabase
            .from('invites')
            .insert({
                email: data.email,
                tenant_id: data.tenantId,
                house_id: data.house_id,
                house_owner: data.house_owner,
                name: data.name,
                is_admin: data.is_admin,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Expires in 7 days
            })
            .select()
            .single()

        if (error) {
            logger('error', 'Error creating invite:', { error })
            throw error
        }

        // send email to user with invite link (${DOMAIN}/accept-invite?token=${inviteData.id})
        return { error: false, message: 'User invited', data: inviteData }
    })

export const getTenantUsersFn = createServerFn({ method: 'POST' })
    .inputValidator(z.object({ tenantId: z.uuid() }))
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()
        const { data: users, error } = await getTenantUsersQuery(supabase, data.tenantId)

        if (error) {
            logger('error', 'Error fetching tenant users:', { error, tenantId: data.tenantId })
            throw error
        }

        return users
    })