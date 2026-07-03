import { type FastifyInstance } from "fastify";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
async function routes(server: FastifyInstance, options: Record<string, unknown>) {
    server.get("/health", {
        schema: {
            description: 'Fraccio Api health check',
            tags: ['Base'],
            response: {
                200: {
                    description: 'Server up',
                    type: 'object',
                    properties: {
                        status: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        reply.send({ status: "ok" });
    });
}

export default routes;