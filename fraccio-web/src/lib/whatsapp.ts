import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { backendFetch } from './backend'

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
  .handler(({ data }) =>
    backendFetch(`/api/v1/comms/tenants/${data.tenantId}/whatsapp/connect`, {
      method: 'POST',
    }),
  )

export const disconnectWhatsappFn = createServerFn({ method: 'POST' })
  .inputValidator(tenantSchema)
  .handler(({ data }) =>
    backendFetch(`/api/v1/comms/tenants/${data.tenantId}/whatsapp/disconnect`, {
      method: 'POST',
    }),
  )

export const getWhatsappStatusFn = createServerFn({ method: 'GET' })
  .inputValidator(tenantSchema)
  .handler(({ data }) =>
    backendFetch(`/api/v1/comms/tenants/${data.tenantId}/whatsapp/status`),
  )

export const getWhatsappQrFn = createServerFn({ method: 'GET' })
  .inputValidator(tenantSchema)
  .handler(({ data }) =>
    backendFetch(`/api/v1/comms/tenants/${data.tenantId}/whatsapp/qr`),
  )

export const sendGroupMessageFn = createServerFn({ method: 'POST' })
  .inputValidator(sendGroupMessageSchema)
  .handler(({ data }) =>
    backendFetch(`/api/v1/comms/tenants/${data.tenantId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message: data.message, groupId: data.groupId }),
    }),
  )

export const createGroupFn = createServerFn({ method: 'POST' })
  .inputValidator(createGroupSchema)
  .handler(({ data }) =>
    backendFetch(`/api/v1/comms/tenants/${data.tenantId}/create-group`, {
      method: 'POST',
      body: JSON.stringify({
        groupName: data.groupName,
        initParticipants: data.initParticipants,
      }),
    }),
  )
