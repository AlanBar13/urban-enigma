import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import QRCode from 'qrcode'
import { backendFetch } from './backend'

export type WhatsappSessionStatus =
  | 'pending_qr'
  | 'connecting'
  | 'ready'
  | 'error'
  | 'disconnected'

export interface WhatsappSession {
  id: string
  tenant_id: string
  client_id: string
  status: WhatsappSessionStatus
  qr_code: string | null
  connected_phone: string | null
  group_id: string | null
  error_message: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

const tenantSchema = z.object({ tenantId: z.uuid() })

const sendGroupMessageSchema = tenantSchema.extend({
  message: z.string().min(1),
  groupId: z.string().optional(),
})

const createGroupSchema = tenantSchema.extend({
  groupName: z.string().min(3),
  initParticipants: z.array(z.string()),
})

export const connectWhatsappFn = createServerFn({ method: 'POST' })
  .inputValidator(tenantSchema)
  .handler(
    ({
      data,
    }): Promise<{
      success: boolean
      jobId: string
      session: WhatsappSession
    }> =>
      backendFetch(`/api/v1/comms/tenants/${data.tenantId}/whatsapp/connect`, {
        method: 'POST',
      }),
  )

export const disconnectWhatsappFn = createServerFn({ method: 'POST' })
  .inputValidator(tenantSchema)
  .handler(
    ({ data }): Promise<{ success: boolean; jobId: string }> =>
      backendFetch(
        `/api/v1/comms/tenants/${data.tenantId}/whatsapp/disconnect`,
        {
          method: 'POST',
        },
      ),
  )

export const getWhatsappStatusFn = createServerFn({ method: 'GET' })
  .inputValidator(tenantSchema)
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; session: WhatsappSession | null }> => {
      const res: { success: boolean; session: WhatsappSession | null } =
        await backendFetch(
          `/api/v1/comms/tenants/${data.tenantId}/whatsapp/status`,
        )
      // ponytail: QR→dataURL here on the server; avoids a client-side QR dep and a second polling call
      if (res.session?.qr_code) {
        res.session.qr_code = await QRCode.toDataURL(res.session.qr_code)
      }
      return res
    },
  )

export const getWhatsappQrFn = createServerFn({ method: 'GET' })
  .inputValidator(tenantSchema)
  .handler(({ data }) =>
    backendFetch(`/api/v1/comms/tenants/${data.tenantId}/whatsapp/qr`),
  )

export const sendGroupMessageFn = createServerFn({ method: 'POST' })
  .inputValidator(sendGroupMessageSchema)
  .handler(
    ({ data }): Promise<{ success: boolean; jobId: string }> =>
      backendFetch(`/api/v1/comms/tenants/${data.tenantId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: data.message, groupId: data.groupId }),
      }),
  )

export const createGroupFn = createServerFn({ method: 'POST' })
  .inputValidator(createGroupSchema)
  .handler(
    ({ data }): Promise<{ success: boolean; jobId: string }> =>
      backendFetch(`/api/v1/comms/tenants/${data.tenantId}/create-group`, {
        method: 'POST',
        body: JSON.stringify({
          groupName: data.groupName,
          initParticipants: data.initParticipants,
        }),
      }),
  )
