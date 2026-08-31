import { type FastifyInstance } from "fastify";
import { revenueController } from "../controllers/revenue.controller.js";

interface RevenueQuery {
    month?: string;
}

/** Current month as YYYY-MM, UTC — matches the controller's month bounds. */
function currentMonth(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Platform-wide superadmin routes (no `:tenantId`). Registered behind
 * requireSuperadmin in server.ts — see the note there.
 */
async function routes(server: FastifyInstance, options: Record<string, unknown>) {
    server.get<{ Querystring: RevenueQuery }>(
        "/revenue",
        {
            schema: {
                description: "Fraccio's own revenue for a month: subscriptions + commissions, broken down by tenant",
                tags: ["Admin"],
                querystring: {
                    type: "object",
                    properties: {
                        month: {
                            type: "string",
                            pattern: "^\\d{4}-(0[1-9]|1[0-2])$",
                            description: "YYYY-MM; defaults to the current month",
                        },
                    },
                },
                response: {
                    200: {
                        description: "Monthly revenue",
                        type: "object",
                        properties: {
                            month: { type: "string" },
                            totals: {
                                type: "object",
                                properties: {
                                    subscriptions: { type: "number" },
                                    commissions: { type: "number" },
                                    total: { type: "number" },
                                },
                            },
                            tenants: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        tenantId: { type: "string", nullable: true },
                                        name: { type: "string" },
                                        plan: { type: "string", nullable: true },
                                        subscriptions: { type: "number" },
                                        commissions: { type: "number" },
                                        total: { type: "number" },
                                        paymentsCount: { type: "integer" },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Revenue lookup failed",
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        async (request, reply) => {
            const month = request.query.month ?? currentMonth();
            try {
                reply.send(await revenueController.getMonthlyRevenue(month));
            } catch (err) {
                request.log.error(err);
                reply.status(500).send({ message: `Error fetching revenue for ${month}` });
            }
        },
    );
}

export default routes;
