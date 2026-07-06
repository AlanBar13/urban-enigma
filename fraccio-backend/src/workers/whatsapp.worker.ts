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
            const session = await whatsappSessionManager.getSession(tenantId);

            if (!session) {
                throw new Error(`WhatsApp session for tenant ${tenantId} does not exist.`);
            }

            if (session.status !== "ready") {
                throw new Error(`WhatsApp client for tenant ${tenantId} is not ready yet.`);
            }

            const client = await whatsappSessionManager.getClient(tenantId);
            const service = new WhatsAppService(client.getClient(), supabaseClient);

            switch (job.name) {
                case "SEND_GROUP_MESSAGE":
                    const { groupId, message } = job.data;
                    return service.sendGroupMessage(groupId, message);
                case "ADD_USER_TO_GROUP":
                    const { groupId: addGroupId, phone } = job.data;
                    return service.addUsertoGroup(addGroupId, phone);
                case "CREATE_TENANT_GROUP":
                    const { groupName, initialMembers } = job.data;
                    return service.createTenantGroup(groupName, initialMembers);
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