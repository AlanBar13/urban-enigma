import { createServerFn } from "@tanstack/react-start";
import { getSupabaseClient } from "../supabase";
import { z } from 'zod'
import { logger } from "@/utils/logger";
import { getInviteQuery } from "./queries"

export const getInviteFn = createServerFn({ method: 'POST' })
    .inputValidator(z.object({ token: z.string() }))
    .handler(async ({ data }) => {
        const { data: invite, error } = await getInviteQuery(getSupabaseClient(), data.token)
        if (error) {
            if (error.code === 'PGRST116') { // No se encontró la invitación
                return null
            }
            logger('error', 'Error fetching invite:', { error })
            throw error
        }
        return invite
    })

export const removeInviteFn = createServerFn({ method: 'POST' })
    .inputValidator(z.object({ token: z.string() }))
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()
        const { error } = await supabase.from('invites').delete().eq('id', data.token)
        if (error) {
            logger('error', 'Error removing invite:', { error })
            throw error
        }
    })