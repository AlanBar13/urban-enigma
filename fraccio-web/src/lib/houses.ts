import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { z } from 'zod'
import { getUser } from './user'
import { logger } from '@/utils/logger'

const createHouseInputSchema = z.object({
    tenantId: z.uuid(),
    name: z.string().min(3).max(30),
    address: z.string().min(5),
})

export const getHousesFn = createServerFn({ method: 'GET' })
    .inputValidator(z.object({ tenantId: z.string() }))
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()

        const userData = await getUser()
        if (userData.role !== 'admin' && userData.role !== 'superadmin') {
            throw new Error('Unauthorized')
        }

        const { data: houses, error } = await supabase
            .from('houses')
            .select('*')
            .eq('tenant_id', data.tenantId)

        if (error) {
            if (error.code === 'PGRST116') {
                return []
            }
            logger('error', 'Error fetching houses:', { error })
            throw error
        }
        return houses
    })

export const createHouseFn = createServerFn({ method: 'POST' })
    .inputValidator(createHouseInputSchema)
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()
        
        const userData = await getUser()
        if (userData.role !== 'admin' && userData.role !== 'superadmin') {
            throw new Error('Unauthorized')
        }
        
        
        const { data: house, error } = await supabase
            .from('houses')
            .insert({
                tenant_id: data.tenantId,
                name: data.name,
                address: data.address,
            }).select().single()

        if (error) {
            logger('error', 'Error creating house:', { error })
            throw error
        }

        return house
    })