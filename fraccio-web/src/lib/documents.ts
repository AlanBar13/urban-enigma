import { logger } from "@/utils/logger";
import { s3Service } from "./s3";
import { createServerFn } from "@tanstack/react-start";
import { z } from 'zod'
import { getSupabaseClient } from "./supabase";
import { getUser, getUserSchema } from "./user";

const getDocumentsSchema = z.object({
    tenantId: z.uuid(),
    user: getUserSchema
})

const deleteDocumentSchema = z.object({
    documentId: z.uuid(),
    s3Key: z.string(),
})

// Types
export interface Document {
    id: string
    name: string
    s3_key: string
    tenant_id: string
    uploaded_by: string
    owner_only: boolean | null
    file_size: number | null
    mime_type: string | null
    created_at: string
    updated_at: string
}

/**
 * Gets documents for regular users with visibility filtering
 * House owners see all documents, non-owners see only public ones
 */
export const getDocumentsFn = createServerFn({ method: 'POST' })
    .inputValidator(getDocumentsSchema)
    .handler(async ({ data }) => {
        const supabase = getSupabaseClient()
        const user = data.user

        // Verify user belongs to the tenant
        if (user.tenantId !== data.tenantId && user.role !== 'superadmin') {
            logger('error', 'User does not belong to tenant', {
                userId: user.email,
                requestedTenant: data.tenantId,
                userTenant: user.tenantId,
            })
            throw new Error('Unauthorized: User does not belong to this tenant')
        }

        let shouldSeeOwnerDocuments = false;
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            // Check if user is a house owner
            const { data: houseOwnerRecord } = await supabase
                .from('house_owners')
                .select('user_id')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle()

            shouldSeeOwnerDocuments = !!houseOwnerRecord
        }else {
            shouldSeeOwnerDocuments = true
        }

        // Build query with conditional visibility filter
        let query = supabase
            .from('documents')
            .select('*')
            .eq('tenant_id', data.tenantId)

        // Non-owners can only see public documents
        if (!shouldSeeOwnerDocuments) {
            query = query.eq('owner_only', false)
        }

        const { data: documents, error } = await query.order('created_at', { ascending: false })

        if (error) {
            logger('error', 'Error fetching documents', { error })
            throw new Error('Failed to fetch documents')
        }

        // Get presigned URLs for private documents
        const documentsWithUrls = await Promise.all(
            documents.map(async (doc) => {
                try {
                    const url = doc.owner_only
                        ? await s3Service.getPreSignedUrl(doc.s3_key)
                        : s3Service.getFileUrl(doc.s3_key)

                    return { ...doc, url }
                } catch (error) {
                    logger('error', 'Error getting document URL', {
                        documentId: doc.id,
                        error
                    })
                    return { ...doc, url: null }
                }
            })
        )

        return documentsWithUrls as (Document & { url: string | null })[]
    })

/**
 * Gets all documents for admin view (no filtering)
 */
export const getAdminDocumentsFn = createServerFn({ method: 'POST' })
    .inputValidator(getDocumentsSchema)
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
            logger('error', 'User is not authorized to view admin documents', {
                userId: user.email,
                role: user.role,
            })
            throw new Error('Unauthorized: Only admins can view all documents')
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

        // Fetch all documents (no filtering)
        const { data: documents, error } = await supabase
            .from('documents')
            .select('*')
            .eq('tenant_id', data.tenantId)
            .order('created_at', { ascending: false })

        if (error) {
            logger('error', 'Error fetching admin documents', { error })
            throw new Error('Failed to fetch documents')
        }

        // Get presigned URLs for private documents
        const documentsWithUrls = await Promise.all(
            documents.map(async (doc) => {
                try {
                    const url = doc.owner_only
                        ? await s3Service.getPreSignedUrl(doc.s3_key)
                        : s3Service.getFileUrl(doc.s3_key)

                    return { ...doc, url }
                } catch (error) {
                    logger('error', 'Error getting document URL', {
                        documentId: doc.id,
                        error
                    })
                    return { ...doc, url: null }
                }
            })
        )

        return documentsWithUrls as (Document & { url: string | null })[]
    })

/**
 * Deletes a document (admin/superadmin only)
 */
export const deleteDocumentFn = createServerFn({ method: 'POST' })
    .inputValidator(deleteDocumentSchema)
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
            logger('error', 'User is not authorized to delete documents', {
                userId: user.email,
                role: user.role,
            })
            throw new Error('Unauthorized: Only admins can delete documents')
        }

        try {
            // Delete from S3
            await s3Service.deleteFile(data.s3Key)

            // Delete from database
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', data.documentId)

            if (error) {
                logger('error', 'Error deleting document from database', { error })
                throw new Error('Failed to delete document')
            }

            logger('info', 'Document deleted successfully', {
                documentId: data.documentId,
            })

            return { success: true }
        } catch (error) {
            logger('error', 'Error deleting document:', { error })
            throw error
        }
    })