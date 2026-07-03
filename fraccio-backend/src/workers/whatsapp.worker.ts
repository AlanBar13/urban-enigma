import { Worker, Job } from "bullmq"
import { WhatsAppClient } from "../lib/whatsapp/client.js";
import { WhatsAppService } from "../lib/whatsapp/service.js";
import SupabaseClient from "../lib/db/client.js";

export async function startWhatsAppWorker() {
    const waClient = new WhatsAppClient("fraccio-whatsapp");
    await waClient.initialize();
    const supabaseClient = SupabaseClient.getInstance().getSupabase();

    const service = new WhatsAppService(waClient.getClient(), supabaseClient);

    const worker = new Worker(
        "whatsapp",
        async (job: Job) => {
            if(!waClient.ready()) {
                throw new Error("WhatsApp client is not ready yet. Please wait for the QR code to be scanned and the client to be ready.");
            }

            switch (job.name) {
                case "SEND_GROUP_MESSAGE":
                    const { tenantId, groupId, message } = job.data;
                    const result = await service.sendGroupMessage(groupId, message);
                    return result;
                case "ADD_USER_TO_GROUP":
                    const { tenantId: addTenantId, groupId: addGroupId, phone } = job.data;
                    const addResult = await service.addUsertoGroup(addGroupId, phone);
                    return addResult;
                case "CREATE_TENANT_GROUP":
                    const { tenantId: createTenantId, groupName, initialMembers } = job.data;
                    const createResult = await service.createTenantGroup(groupName, initialMembers);
                    return createResult;
                default:
                    throw new Error(`Unknown job name: ${job.name}`);
            }
        },
        {
            connection: {
                host: process.env.REDIS_HOST || "localhost",
                port: Number(process.env.REDIS_PORT) || 6379,
            },
            concurrency: 1, // Ensure that jobs are processed one at a time to keep session state
        }
    );

    worker.on("completed", (job) => {
        console.log(`Job ${job.id} has completed! Result:`, job.returnvalue);
    });

    worker.on("failed", (job, err) => {
        console.error(`Job ${job?.id} has failed with error:`, err);
    });
}