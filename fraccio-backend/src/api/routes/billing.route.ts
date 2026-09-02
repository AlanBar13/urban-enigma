import { type FastifyInstance } from "fastify";
import {
    billingController,
    NoSubscriptionError,
    PlanNotBillableError,
    type PlanName,
} from "../controllers/billing.controller.js";
import { requireAdmin } from "../plugins/auth.js";

interface BillingRouteParams {
    tenantId: string;
}

interface CreateSubscriptionBody {
    plan: PlanName;
}

const tenantParamsSchema = {
    type: "object",
    required: ["tenantId"],
    properties: {
        tenantId: { type: "string", description: "Unique tenant id" },
    },
} as const;

const messageSchema = {
    type: "object",
    properties: { message: { type: "string" } },
} as const;

/**
 * SaaS subscription routes (platform account, NOT Connect).
 * Registered behind requireTenantAuth; every route additionally requires admin.
 */
async function routes(server: FastifyInstance, options: Record<string, unknown>) {
    server.post<{ Params: BillingRouteParams; Body: CreateSubscriptionBody }>(
        "/tenants/:tenantId/subscription",
        {
            preHandler: requireAdmin,
            schema: {
                description: "Creates a Stripe Checkout session to subscribe the tenant to a paid plan",
                tags: ["Billing"],
                params: tenantParamsSchema,
                body: {
                    type: "object",
                    required: ["plan"],
                    properties: {
                        plan: { type: "string", enum: ["basico", "esencial", "pro"] },
                    },
                },
                response: {
                    200: {
                        description: "Checkout session created",
                        type: "object",
                        properties: { url: { type: "string", nullable: true } },
                    },
                    409: { description: "Plan is not billable online", ...messageSchema },
                    500: { description: "Checkout session not created", ...messageSchema },
                },
            },
        },
        async (request, reply) => {
            const { tenantId } = request.params;
            try {
                reply.send(await billingController.createSubscriptionCheckout(tenantId, request.body.plan));
            } catch (err) {
                if (err instanceof PlanNotBillableError) {
                    return reply.status(409).send({ message: err.message });
                }
                request.log.error(err);
                reply.status(500).send({ message: `Error creating subscription checkout for tenant ${tenantId}` });
            }
        },
    );

    server.post<{ Params: BillingRouteParams }>(
        "/tenants/:tenantId/subscription/portal",
        {
            preHandler: requireAdmin,
            schema: {
                description: "Creates a Stripe Billing Portal session (cancel, change card, invoices)",
                tags: ["Billing"],
                params: tenantParamsSchema,
                response: {
                    200: {
                        description: "Portal session created",
                        type: "object",
                        properties: { url: { type: "string" } },
                    },
                    409: { description: "No subscription to manage", ...messageSchema },
                    500: { description: "Portal session not created", ...messageSchema },
                },
            },
        },
        async (request, reply) => {
            const { tenantId } = request.params;
            try {
                reply.send(await billingController.createPortalSession(tenantId));
            } catch (err) {
                if (err instanceof NoSubscriptionError) {
                    return reply.status(409).send({ message: err.message });
                }
                request.log.error(err);
                reply.status(500).send({ message: `Error creating billing portal session for tenant ${tenantId}` });
            }
        },
    );

    server.get<{ Params: BillingRouteParams }>(
        "/tenants/:tenantId/subscription",
        {
            preHandler: requireAdmin,
            schema: {
                description: "Returns the tenant's plan, subscription status and billed house count",
                tags: ["Billing"],
                params: tenantParamsSchema,
                response: {
                    200: {
                        description: "Subscription status",
                        type: "object",
                        properties: {
                            plan: { type: "string" },
                            status: { type: "string", nullable: true },
                            houseCount: { type: "integer" },
                            feeMxn: { type: "number" },
                            monthlyMxn: { type: "number", nullable: true },
                            currentPeriodEnd: { type: "integer", nullable: true },
                        },
                    },
                    500: { description: "Status lookup failed", ...messageSchema },
                },
            },
        },
        async (request, reply) => {
            const { tenantId } = request.params;
            try {
                reply.send(await billingController.getSubscriptionStatus(tenantId));
            } catch (err) {
                request.log.error(err);
                reply.status(500).send({ message: `Error fetching subscription status for tenant ${tenantId}` });
            }
        },
    );

    server.get<{ Params: BillingRouteParams }>(
        "/tenants/:tenantId/subscription/invoices",
        {
            preHandler: requireAdmin,
            schema: {
                description: "Returns the tenant's recent SaaS receipts, newest first",
                tags: ["Billing"],
                params: tenantParamsSchema,
                response: {
                    200: {
                        description: "Receipt history",
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                number: { type: "string", nullable: true },
                                created: { type: "integer" },
                                amountPaid: { type: "number" },
                                status: { type: "string", nullable: true },
                                hostedUrl: { type: "string", nullable: true },
                                pdfUrl: { type: "string", nullable: true },
                            },
                        },
                    },
                    500: { description: "Invoice lookup failed", ...messageSchema },
                },
            },
        },
        async (request, reply) => {
            const { tenantId } = request.params;
            try {
                reply.send(await billingController.listInvoices(tenantId));
            } catch (err) {
                request.log.error(err);
                reply.status(500).send({ message: `Error fetching invoices for tenant ${tenantId}` });
            }
        },
    );
}

export default routes;
