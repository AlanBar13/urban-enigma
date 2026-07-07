import { Worker, Job } from "bullmq"
import { WhatsAppService } from "../lib/whatsapp/service.js";
import SupabaseClient from "../lib/db/client.js";
import { whatsappSessionManager } from "../lib/whatsapp/session-manager.js";

export async function startWhatsAppWorker() {
    const supabaseClient = SupabaseClient.getInstance().getSupabase();

    const worker = new Worker(
        "whatsapp",
        async (job: Job) => {
            const { tenantId } = job.data;

            switch (job.name) {
                case "INIT_TENANT_SESSION": {
                    const session = await whatsappSessionManager.ensureSession(tenantId);
                    await whatsappSessionManager.getClient(tenantId);
                    return { success: true, session };
                }
                case "SEND_GROUP_MESSAGE": {
                    const session = await whatsappSessionManager.getSession(tenantId);

                    if (!session) {
                        throw new Error(`WhatsApp session for tenant ${tenantId} does not exist.`);
                    }

                    if (session.status !== "ready") {
                        throw new Error(`WhatsApp client for tenant ${tenantId} is not ready yet.`);
                    }

                    const { groupId, message } = job.data;
                    const client = await whatsappSessionManager.getClient(tenantId);
                    const service = new WhatsAppService(client.getClient(), supabaseClient);
                    return service.sendGroupMessage(groupId, message);
                }
                case "ADD_USER_TO_GROUP": {
                    const session = await whatsappSessionManager.getSession(tenantId);

                    if (!session) {
                        throw new Error(`WhatsApp session for tenant ${tenantId} does not exist.`);
                    }

                    if (session.status !== "ready") {
                        throw new Error(`WhatsApp client for tenant ${tenantId} is not ready yet.`);
                    }

                    const { groupId: addGroupId, phone } = job.data;
                    const client = await whatsappSessionManager.getClient(tenantId);
                    const service = new WhatsAppService(client.getClient(), supabaseClient);
                    return service.addUsertoGroup(addGroupId, phone);
                }
                case "CREATE_TENANT_GROUP": {
                    const session = await whatsappSessionManager.getSession(tenantId);

                    if (!session) {
                        throw new Error(`WhatsApp session for tenant ${tenantId} does not exist.`);
                    }

                    if (session.status !== "ready") {
                        throw new Error(`WhatsApp client for tenant ${tenantId} is not ready yet.`);
                    }

                    const { groupName, initialMembers } = job.data;
                    const client = await whatsappSessionManager.getClient(tenantId);
                    const service = new WhatsAppService(client.getClient(), supabaseClient);
                    return service.createTenantGroup(groupName, initialMembers);
                }
                default:
                    throw new Error(`Unknown job name: ${job.name}`);
            }
        },
        {
            connection: {
                host: process.env.REDIS_HOST || "localhost",
                port: Number(process.env.REDIS_PORT) || 6379,
            },
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