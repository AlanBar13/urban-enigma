import { Worker, Job } from "bullmq"
import { WhatsAppService } from "../lib/whatsapp/service.js";
import SupabaseClient from "../lib/db/client.js";
import { whatsappSessionManager } from "../lib/whatsapp/session-manager.js";
import type { WhatsAppSession } from "../lib/whatsapp/session-manager.js";
import { redisConnection } from "../lib/redis.js";

export async function startWhatsAppWorker() {
    const supabaseClient = SupabaseClient.getInstance().getSupabase();

    async function getReadyService(tenantId: string): Promise<{ session: WhatsAppSession; service: WhatsAppService }> {
        const session = await whatsappSessionManager.getSession(tenantId);

        if (!session) {
            throw new Error(`WhatsApp session for tenant ${tenantId} does not exist.`);
        }

        if (session.status !== "ready") {
            throw new Error(`WhatsApp client for tenant ${tenantId} is not ready yet (status: ${session.status}).`);
        }

        const client = await whatsappSessionManager.getClient(tenantId);
        return { session, service: new WhatsAppService(client.getClient(), supabaseClient) };
    }

    const worker = new Worker(
        "whatsapp",
        async (job: Job) => {
            const { tenantId } = job.data;

            switch (job.name) {
                case "INIT_TENANT_SESSION": {
                    // waitReady: false — readiness depends on the user scanning the QR,
                    // and this worker is concurrency:1 so we must not block on it.
                    await whatsappSessionManager.getClient(tenantId, false);
                    return { success: true };
                }
                case "SEND_GROUP_MESSAGE": {
                    const { session, service } = await getReadyService(tenantId);
                    const { message, media } = job.data;
                    const groupId = job.data.groupId ?? session.group_id;

                    if (!groupId) {
                        throw new Error(`No groupId provided and tenant ${tenantId} has no stored group.`);
                    }

                    return service.sendGroupMessage(groupId, message, media);
                }
                case "ADD_USER_TO_GROUP": {
                    const { session, service } = await getReadyService(tenantId);
                    const { phone } = job.data;
                    const groupId = job.data.groupId ?? session.group_id;

                    if (!groupId) {
                        throw new Error(`No groupId provided and tenant ${tenantId} has no stored group.`);
                    }

                    return service.addUsertoGroup(groupId, phone);
                }
                case "CREATE_TENANT_GROUP": {
                    const { service } = await getReadyService(tenantId);
                    const { groupName, initialMembers } = job.data;
                    const result = await service.createTenantGroup(groupName, initialMembers ?? []);
                    await whatsappSessionManager.updateSession(tenantId, { group_id: result.groupId });
                    return result;
                }
                case "DISCONNECT_TENANT_SESSION": {
                    const session = await whatsappSessionManager.disconnectClient(tenantId);
                    return { success: true, session };
                }
                default:
                    throw new Error(`Unknown job name: ${job.name}`);
            }
        },
        {
            connection: redisConnection,
            concurrency: 1,
        }
    );

    worker.on("completed", (job) => {
        console.log(`Job ${job.id} has completed! Result:`, job.returnvalue);
    });

    worker.on("failed", (job, err) => {
        console.error(`Job ${job?.id} has failed with error:`, err);
    });
}
