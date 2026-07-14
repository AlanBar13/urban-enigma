import { createFileRoute } from '@tanstack/react-router'
import { backendFetch } from '@/lib/backend'
import { s3Service } from '@/lib/s3'
import { getSupabaseClient } from '@/lib/supabase'
import { getUser } from '@/lib/user'
import { logger } from '@/utils/logger'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

export const Route = createFileRoute('/api/upload/anuncio')({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
          return new Response(
            JSON.stringify({
              error: 'Unauthorized: Only admins can create announcements',
            }),
            { status: 403 },
          )
        }

        const formData = await request.formData()
        const title = ((formData.get('title') as string) || '').trim()
        const description = (
          (formData.get('description') as string) || ''
        ).trim()
        const ownersOnly = formData.get('ownersOnly') === 'true'
        const sendWhatsapp = formData.get('sendWhatsapp') === 'true'
        const tenantId = formData.get('tenantId') as string
        const tenantPath = formData.get('tenantPath') as string
        const fileEntry = formData.get('file')
        const file =
          fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null

        // Validate required fields
        if (!tenantId || title.length < 3) {
          logger('error', 'Missing required fields for announcement')
          return new Response(
            JSON.stringify({
              error: 'Title must be at least 3 characters',
            }),
            { status: 400 },
          )
        }

        // Verify user belongs to the tenant
        if (user.tenantId !== tenantId) {
          logger('error', 'User does not belong to tenant', {
            userId: user.email,
            requestedTenant: tenantId,
            userTenant: user.tenantId,
          })
          return new Response(
            JSON.stringify({
              error: 'Unauthorized: User does not belong to this tenant',
            }),
            { status: 403 },
          )
        }

        if (file) {
          // Validate file size
          if (file.size > MAX_FILE_SIZE) {
            return new Response(
              JSON.stringify({ error: 'File size must not exceed 5MB' }),
              { status: 400 },
            )
          }

          // Validate file type
          if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return new Response(
              JSON.stringify({
                error:
                  'Only PDF and image files (JPEG, PNG, GIF, WebP) are allowed',
              }),
              { status: 400 },
            )
          }
        }

        try {
          // Upload attachment to S3 (public unless owners-only)
          let key: string | null = null
          if (file) {
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const uploaded = await s3Service.uploadFile(
              buffer,
              tenantPath,
              !ownersOnly,
              file.name,
              file.type,
            )
            key = uploaded.key
          }

          // Save announcement to database
          const { error } = await supabase
            .from('announcements')
            .insert({
              tenant_id: tenantId,
              title,
              description: description || null,
              owners_only: ownersOnly,
              interactions: 0,
              attachment_s3_key: key,
              attachment_mime_type: file?.type ?? null,
              attachment_name: file?.name ?? null,
            })
            .select()
            .single()

          if (error) {
            // If database insert fails, try to delete the uploaded file from S3
            if (key) {
              try {
                await s3Service.deleteFile(key)
              } catch (deleteError) {
                logger(
                  'error',
                  'Failed to delete orphaned S3 file after DB error',
                  { key, deleteError },
                )
              }
            }
            logger('error', 'Error creating announcement', { error })
            return new Response(
              JSON.stringify({ error: 'Error creating announcement' }),
              { status: 500 },
            )
          }

          // Announcement is saved; a WhatsApp failure must not fail the request
          let whatsappError = false
          if (sendWhatsapp) {
            try {
              const message = description
                ? `*${title}*\n\n${description}`
                : `*${title}*`
              const media =
                key && file
                  ? {
                      url: ownersOnly
                        ? await s3Service.getPreSignedUrl(key)
                        : s3Service.getFileUrl(key),
                      filename: file.name,
                    }
                  : undefined
              await backendFetch(`/api/v1/comms/tenants/${tenantId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ message, media }),
              })
            } catch (waError) {
              logger('error', 'Error sending announcement via WhatsApp', {
                waError,
              })
              whatsappError = true
            }
          }

          return new Response(
            JSON.stringify({ message: 'Announcement created', whatsappError }),
            { status: 200 },
          )
        } catch (error) {
          logger('error', 'Error creating announcement:', { error })
          return new Response(
            JSON.stringify({ error: 'Error creating announcement' }),
            { status: 500 },
          )
        }
      },
    },
  },
})
