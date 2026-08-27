import { createFileRoute } from '@tanstack/react-router'
import { s3Service } from '@/lib/s3'
import { getSupabaseClient } from '@/lib/supabase'
import { getUser } from '@/lib/user'
import { getUserHouse } from '@/lib/casa'
import { canAccessTenant } from '@/lib/auth'
import { isFeatureEnabled } from '@/lib/tenants'
import { logger } from '@/utils/logger'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

const ALLOWED_METHODS = ['cash', 'transfer']

/**
 * A resident's proof of a cash/SPEI payment. Unlike document uploads this is
 * *not* admin-only — the whole point is that the person who paid submits it —
 * so the guard is ownership instead: the charge must belong to the caller's
 * house and still be pending. The charge moves to `in_review`; only an admin
 * can mark it completed (reviewPaymentFn).
 */
export const Route = createFileRoute('/api/upload/comprobante')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabase = getSupabaseClient()
        const user = await getUser()

        const formData = await request.formData()
        const paymentId = Number(formData.get('paymentId'))
        const method = formData.get('method') as string | null
        const file = formData.get('file') as File | null
        const tenantId = formData.get('tenantId') as string
        const tenantPath = formData.get('tenantPath') as string

        if (!tenantId || !paymentId || !file || !method) {
          return new Response(
            JSON.stringify({
              error:
                'Missing required fields: tenantId, paymentId, method, or file',
            }),
            { status: 400 },
          )
        }

        if (!canAccessTenant(user, tenantId)) {
          logger('error', 'User does not belong to tenant', {
            userId: user.email,
            requestedTenant: tenantId,
          })
          return new Response(
            JSON.stringify({
              error: 'Unauthorized: User does not belong to this tenant',
            }),
            { status: 403 },
          )
        }

        // The real gate: the UI hides "Ya pagué" when the toggle is off, but a
        // tenant that doesn't want comprobantes must not receive one anyway.
        const { data: tenant } = await supabase
          .from('tenants')
          .select('features')
          .eq('id', tenantId)
          .single()

        if (!isFeatureEnabled(tenant?.features ?? null, 'comprobante')) {
          return new Response(
            JSON.stringify({
              error:
                'Este fraccionamiento no acepta comprobantes de pago manual',
            }),
            { status: 403 },
          )
        }

        if (!ALLOWED_METHODS.includes(method)) {
          return new Response(
            JSON.stringify({ error: 'Método de pago inválido' }),
            { status: 400 },
          )
        }

        if (file.size > MAX_FILE_SIZE) {
          return new Response(
            JSON.stringify({ error: 'El archivo no debe exceder 5MB' }),
            { status: 400 },
          )
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return new Response(
            JSON.stringify({
              error: 'Solo se permiten archivos PDF o imágenes',
            }),
            { status: 400 },
          )
        }

        // The house comes from the session, never from the form — otherwise a
        // resident could attach a comprobante to a neighbour's charge.
        const { houseId } = await getUserHouse(supabase, user.id)
        if (!houseId) {
          return new Response(
            JSON.stringify({ error: 'No tienes una casa asignada' }),
            { status: 403 },
          )
        }

        const { data: charge } = await supabase
          .from('payments')
          .select('id')
          .eq('id', paymentId)
          .eq('tenant_id', tenantId)
          .eq('house_id', houseId)
          .eq('status', 'pending')
          .maybeSingle()

        if (!charge) {
          return new Response(
            JSON.stringify({ error: 'El cargo no existe o ya fue procesado' }),
            { status: 404 },
          )
        }

        try {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Private: a comprobante carries bank details and a neighbour's name
          const { key } = await s3Service.uploadFile(
            buffer,
            tenantPath,
            false,
            file.name,
            file.type,
          )

          const { error } = await supabase
            .from('payments')
            .update({
              status: 'in_review',
              payment_method: method,
              proof_s3_key: key,
              submitted_by: user.id,
              review_note: null,
            })
            .eq('id', charge.id)

          if (error) {
            // Same orphan cleanup as the document upload route
            try {
              await s3Service.deleteFile(key)
            } catch (deleteError) {
              logger(
                'error',
                'Failed to delete orphaned comprobante after DB error',
                {
                  key,
                  deleteError,
                },
              )
            }
            logger('error', 'Error attaching comprobante', { error })
            return new Response(
              JSON.stringify({ error: 'Error al registrar el comprobante' }),
              { status: 500 },
            )
          }

          return new Response(
            JSON.stringify({ message: 'Comprobante enviado a revisión' }),
            { status: 200 },
          )
        } catch (error) {
          logger('error', 'Error uploading comprobante:', { error })
          return new Response(
            JSON.stringify({ error: 'Error al subir el comprobante' }),
            { status: 500 },
          )
        }
      },
    },
  },
})
