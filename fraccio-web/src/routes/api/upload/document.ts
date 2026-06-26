import { s3Service } from '@/lib/s3'
import { getSupabaseClient } from '@/lib/supabase'
import { getUser } from '@/lib/user'
import { logger } from '@/utils/logger'
import { createFileRoute } from '@tanstack/react-router'

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
]

export const Route = createFileRoute('/api/upload/document')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log('Received document upload request')
        const supabase = getSupabaseClient()

        // Get authenticated user
        const user = await getUser()
        if (!user) {
          logger('error', 'User not authenticated')
          throw new Error('User not authenticated')
        }

        // Verify user is admin or superadmin
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          logger('error', 'User is not authorized to upload documents', {
            userId: user.email,
            role: user.role,
          })
          return new Response(JSON.stringify({ error: 'Unauthorized: Only admins can upload documents' }), { status: 403 })
        }

        const formData = await request.formData()
        const name = formData.get('name') as string
        const file = formData.get('file') as File
        const ownerOnly = formData.get('ownerOnly') === 'true'
        const tenantId = formData.get('tenantId') as string
        const tenantPath = formData.get('tenantPath') as string

        // Validate required fields
        if (!tenantId || !name || !file) {
          logger('error', 'Missing required fields for document upload')
          return new Response(JSON.stringify({ error: 'Missing required fields: tenantId, name, or file' }), { status: 400 })
        }

        // Verify user belongs to the tenant
        if (user.tenantId !== tenantId) {
          logger('error', 'User does not belong to tenant', {
            userId: user.email,
            requestedTenant: tenantId,
            userTenant: user.tenantId,
          })
          return new Response(JSON.stringify({ error: 'Unauthorized: User does not belong to this tenant' }), { status: 403 })
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File size must not exceed 5MB`)
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          throw new Error('Only PDF and image files (JPEG, PNG, GIF, WebP) are allowed')
        }

        try {
          // Convert File to Buffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Upload to S3
          const { key } = await s3Service.uploadFile(
            buffer,
            tenantPath,
            !ownerOnly, // isPublic - if not owner_only, make it public
            file.name,
            file.type
          )

          // Save document metadata to database
          const { error } = await supabase
            .from('documents')
            .insert({
              name: name,
              s3_key: key,
              tenant_id: tenantId,
              uploaded_by: user.id,
              owner_only: ownerOnly,
              file_size: file.size,
              mime_type: file.type,
            })
            .select()
            .single()

          if (error) {
            // If database insert fails, try to delete the uploaded file from S3
            try {
              await s3Service.deleteFile(key)
            } catch (deleteError) {
              logger('error', 'Failed to delete orphaned S3 file after DB error', {
                key,
                deleteError
              })
            }
            logger('error', 'Error saving document metadata', { error })
            return new Response(JSON.stringify({ error: 'Error saving document metadata' }), { status: 500 })
          }

          return new Response(JSON.stringify({ message: 'Document uploaded successfully' }), { status: 200 })
        } catch (error) {
          logger('error', 'Error uploading document:', { error })
          return new Response(JSON.stringify({ error: 'Error uploading document' }), { status: 500 })
        }
      }
    }
  }
}
)

