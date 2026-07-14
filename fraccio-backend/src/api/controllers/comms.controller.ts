import type { Queue } from "bullmq";
import { whatsappQueue } from "../../queue/whatsapp.queue.js";
import type { MessageMediaInput } from "../../lib/whatsapp/service.js";

const jobOptions = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
} as const;

class CommsController {
    private queue: Queue

    constructor(queue: Queue) {
        this.queue = queue
    }

    /**
     * Sends a message to the tenant group
     * @param {tenantId} id of the tenant to send the message
     * @param {groupId} wa group id to send the message; omit to use the tenant's stored group
     * @param {message} message to send to the group
     * @param {media} optional attachment sent by URL (image or document)
     */
    async sendWaMessage(tenantId: string, groupId: string | undefined, message: string, media?: MessageMediaInput): Promise<{ success: boolean, jobId: string | undefined }> {
        const job = await this.queue.add(
            "SEND_GROUP_MESSAGE",
            {
                tenantId,
                groupId,
                message,
                media
            },
            jobOptions
        )

        return {
            success: true,
            jobId: job.id
        }
    }

    /**
     * Creates a wa group for the tenant
     * @param {tenantId} id of the tenant to creatye the group for
     * @param {groupName} name for the wa group
     * @param {initialMembers} numbers of the participants of the group
     */
    async createWaTenantGroup(tenantId: string, groupName: string, initialMembers: string[]): Promise<{ success: boolean, jobId: string | undefined }> {
        const job = await this.queue.add(
            "CREATE_TENANT_GROUP",
            {
                tenantId,
                groupName,
                initialMembers
            },
            jobOptions
        )

        return {
            success: true,
            jobId: job.id
        }
    }
}

export const commsController = new CommsController(whatsappQueue)
