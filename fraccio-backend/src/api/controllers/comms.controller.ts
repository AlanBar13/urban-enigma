import type { Queue } from "bullmq";
import { whatsappQueue } from "../../queue/whatsapp.queue.js";

class CommsController {
    private queue: Queue

    constructor(queue: Queue) {
        this.queue = queue
    }

    /**
     * Sends a message to the tenant group
     * @param {tenantId} id of the tenant to send the message
     * @param {groupId} wa group id to send the message
     * @param {message} message to send to the group
     */
    async sendWaMessage(tenantId: string, groupId: string, message: string): Promise<{ success: boolean, jobId: string | undefined }> {
        try {
            const job = await this.queue.add(
                "SEND_GROUP_MESSAGE",
                {
                    tenantId,
                    groupId,
                    message
                },
                {
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 5000
                    },
                    removeOnComplete: true,
                    removeOnFail: false
                })

            return {
                success: true,
                jobId: job.id
            }
        } catch (err) {
            console.log('[Err] Send WaMessage error: ', err)
            return {
                success: true,
                jobId: undefined
            }
        }
    }

    /**
     * Creates a wa group for the tenant
     * @param {tenantId} id of the tenant to creatye the group for
     * @param {groupName} name for the wa group
     * @param {initialMembers} numbers of the participants of the group
     */
    async createWaTenantGroup(tenantId: string, groupName: string, initialMembers: string[]) {
        const job = await this.queue.add(
            "CREATE_TENANT_GROUP",
            {
                tenantId,
                groupName,
                initialMembers
            },
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: false
            }
        )

        return {
            success: true
        }
    }
}

export const commsController = new CommsController(whatsappQueue)