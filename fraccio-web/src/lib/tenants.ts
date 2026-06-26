import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { z } from 'zod'
import { logger } from '@/utils/logger'

const createTenantSchema = z.object({
    name: z.string().min(3),
    subdomain: z.string().min(3)
})

export const listTenantsFn = createServerFn({ method: 'GET' })
    .handler(async () => {
        const supabase = getSupabaseClient()
        const { data: tenants, error } = await supabase.from('tenants').select('*')
        if (error) {
            logger('error', 'Error fetching tenants:', { error })
            throw error
        }
        return tenants
    })

export const getTenantFn = createServerFn({ method: 'GET' })
    .inputValidator(z.object({ path: z.string() }))
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()
        const { data: tenant, error } = await supabase.from('tenants').select('*').eq('path', data.path).single()
        if (error) {
            if (error.code === 'PGRST116') {
                return null
            }
            logger('error', 'Error fetching tenant:', { error })
            throw error
        }
        if (!tenant) {
            throw new Error('Tenant not found')
        }

        return tenant
    })

export const getTenantByIdFn = createServerFn({ method: 'GET' })
    .inputValidator(z.object({ id: z.string() }))
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()
        const { data: tenant, error } = await supabase.from('tenants').select('*').eq('id', data.id).single()
        if (error) {
            if (error.code === 'PGRST116') {
                return null
            }
            logger('error', 'Error fetching tenant by ID:', { id: data.id, error })
            throw error
        }
        if (!tenant) {
            throw new Error('Tenant not found')
        }

        return tenant
    })

export const createTenantFn = createServerFn({ method: 'POST' })
    .inputValidator(createTenantSchema)
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()
        const { data: tenant, error } = await supabase.from('tenants').insert({
            name: data.name,
            path: data.subdomain
        }).select().single();

        if (error) {
            logger('error', 'Error creating tenant:', { error })
            throw error
        }

        return tenant
    })