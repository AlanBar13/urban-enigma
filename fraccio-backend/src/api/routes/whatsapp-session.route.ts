import { type FastifyInstance } from "fastify";
import { whatsappQueue } from "../../queue/whatsapp.queue.js";
import { whatsappSessionManager } from "../../lib/whatsapp/session-manager.js";

interface SessionRouteParams {
    tenantId: string;
}

const jobOptions = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
} as const;

const tenantIdParams = {
    type: 'object',
    required: ['tenantId'],
    properties: {
        tenantId: { type: 'string', description: 'Unique tenant id' }
    }
} as const;

const sessionSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        tenant_id: { type: 'string' },
        client_id: { type: 'string' },
        status: { type: 'string', enum: ['pending_qr', 'connecting', 'ready', 'error', 'disconnected'] },
        qr_code: { type: ['string', 'null'] },
        connected_phone: { type: ['string', 'null'] },
        group_id: { type: ['string', 'null'] },
        error_message: { type: ['string', 'null'] },
        last_seen_at: { type: ['string', 'null'] },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
    }
} as const;

const errorResponse = {
    description: 'Request failed',
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
    }
} as const;

async function routes(server: FastifyInstance) {
    server.post<{ Params: SessionRouteParams }>('/tenants/:tenantId/whatsapp/connect', {
        schema: {
            description: 'Starts (or resumes) the WhatsApp linking flow for a tenant',
            tags: ['Comms'],
            params: tenantIdParams,
            response: {
                200: {
                    description: 'Session linking started',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        jobId: { type: 'string' },
                        session: sessionSchema,
                    }
                },
                500: errorResponse
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request.params;

        try {
            const session = await whatsappSessionManager.ensureSession(tenantId);
            const job = await whatsappQueue.add("INIT_TENANT_SESSION", { tenantId }, jobOptions);
            reply.send({ success: true, jobId: job.id, session });
        } catch (error) {
            reply.status(500).send({ success: false, message: (error as Error).message });
        }
    });

    server.post<{ Params: SessionRouteParams }>('/tenants/:tenantId/whatsapp/disconnect', {
        schema: {
            description: "Logs out the tenant's WhatsApp client and clears the session",
            tags: ['Comms'],
            params: tenantIdParams,
            response: {
                200: {
                    description: 'Disconnect enqueued',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        jobId: { type: 'string' },
                    }
                },
                500: errorResponse
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request.params;

        try {
            const job = await whatsappQueue.add("DISCONNECT_TENANT_SESSION", { tenantId }, jobOptions);
            reply.send({ success: true, jobId: job.id });
        } catch (error) {
            reply.status(500).send({ success: false, message: (error as Error).message });
        }
    });

    server.get<{ Params: SessionRouteParams }>('/tenants/:tenantId/whatsapp/status', {
        schema: {
            description: "Returns the tenant's current WhatsApp session status",
            tags: ['Comms'],
            params: tenantIdParams,
            response: {
                200: {
                    description: 'Session status',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        session: { ...sessionSchema, type: ['object', 'null'] },
                    }
                },
                500: errorResponse
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request.params;

        try {
            const session = await whatsappSessionManager.getSession(tenantId);
            reply.send({ success: true, session });
        } catch (error) {
            reply.status(500).send({ success: false, message: (error as Error).message });
        }
    });

    server.get<{ Params: SessionRouteParams }>('/tenants/:tenantId/whatsapp/qr', {
        schema: {
            description: "Returns the tenant's current QR code for linking, if any",
            tags: ['Comms'],
            params: tenantIdParams,
            response: {
                200: {
                    description: 'QR code',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        qrCode: { type: ['string', 'null'] },
                    }
                },
                500: errorResponse
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request.params;

        try {
            const qrCode = await whatsappSessionManager.getQrCode(tenantId);
            reply.send({ success: true, qrCode });
        } catch (error) {
            reply.status(500).send({ success: false, message: (error as Error).message });
        }
    });
}

export default routes;
