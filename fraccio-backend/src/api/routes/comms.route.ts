import { type FastifyInstance } from "fastify";
import { commsController } from "../controllers/comms.controller.js";

interface CommsRouteParams {
    tenantId: string;
}

interface SendMessageBody {
    groupId: string;
    message: string;
}

interface CreateWaGroupBody {
    groupName: string
    initParticipants: string[]
}

/**
 * Encapsulates comms routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
async function routes(server: FastifyInstance, options: Record<string, unknown>) {
    server.post<{ Params: CommsRouteParams, Body: SendMessageBody }>("/tenants/:tenantId/messages", {
        schema: {
            description: 'Sends Message to their tenant WaGroup',
            tags: ['Comms'],
            params: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string', description: 'Unique tenant id' }
                }
            },
            body: {
                type: 'object',
                required: ['groupId', 'message'],
                properties: {
                    groupId: { type: 'string', minLength: 3 },
                    message: { type: 'string' },
                }
            },
            response: {
                200: {
                    description: 'Message sent succesfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        jobId: { type: 'string' }
                    }
                },
                500: {
                    description: 'Message was not sent',
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request.params;
        const { groupId, message } = request.body;
        try {
            const result = await commsController.sendWaMessage(tenantId, groupId, message)
            reply.send(result);
        } catch (err) {
            reply.status(500).send({
                message: `Error sending message to tenant group ${tenantId}`
            })
        }
    })

    server.post<{ Params: CommsRouteParams, Body: CreateWaGroupBody }>("/tenants/:tenantId/create-group", {
        schema: {
            description: 'Creates a new WaGroup for the tenant',
            tags: ['Comms'],
            params: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string', description: 'Unique tenant id' }
                }
            },
            body: {
                type: 'object',
                required: ['groupName', 'initParticipants'],
                properties: {
                    groupName: { type: 'string', minLength: 3 },
                    initParticipants: {
                        type: 'array', 
                        items: {
                            type: 'string'
                        },
                    },
                }
            },
            response: {
                201: {
                    description: 'WaGroup created',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' }
                    }
                },
                500: {
                    description: 'WaGroup not created',
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request.params;
        const { groupName, initParticipants } = request.body;
        try {
            const result = await commsController.createWaTenantGroup(tenantId, groupName, initParticipants)
            reply.status(201).send(result);
        } catch (err) {
            reply.status(500).send({
                message: `Error sending message to tenant group ${tenantId}`
            })
        }
    })
}

export default routes;