import { type FastifyInstance } from "fastify";

export function configureBaseRoutes(server: FastifyInstance) {
    server.get("/health", async (request, reply) => {
        reply.send({ status: "ok" });
    });
}