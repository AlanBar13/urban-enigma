import { type FastifyInstance } from "fastify";
import { whatsappQueue } from "../../queue/whatsapp.queue.js";
import { whatsappSessionManager } from "../../lib/whatsapp/session-manager.js";

interface SessionRouteParams {
    tenantId: string;
}

async function routes(server: FastifyInstance) {
    server.post<{ Params: SessionRouteParams }>('/tenants/:tenantId/whatsapp/connect', async (request, reply) => {
        const { tenantId } = request.params;

        try {
            const session = await whatsappSessionManager.connectSession(tenantId);
            await whatsappQueue.add(
                "INIT_TENANT_SESSION",
                { tenantId },
                {
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 5000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            );
            reply.send({ success: true, session });
        } catch (error) {
            reply.status(500).send({ success: false, message: (error as Error).message });
        }
    });

    server.get<{ Params: SessionRouteParams }>('/tenants/:tenantId/whatsapp/status', async (request, reply) => {
        const { tenantId } = request.params;

        try {
            const session = await whatsappSessionManager.getSessionStatus(tenantId);
            reply.send({ success: true, session });
        } catch (error) {
            reply.status(500).send({ success: false, message: (error as Error).message });
        }
    });

    server.get<{ Params: SessionRouteParams }>('/tenants/:tenantId/whatsapp/qr', async (request, reply) => {
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
