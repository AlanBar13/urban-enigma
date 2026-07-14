import { type FastifyInstance } from "fastify";
import { paymentsController, PaymentsNotEnabledError } from "../controllers/payments.controller.js";
import { requireAdmin } from "../plugins/auth.js";

interface PaymentsRouteParams {
    tenantId: string;
}

interface CreateCheckoutBody {
    paymentItemId: number;
}

const tenantParamsSchema = {
    type: "object",
    required: ["tenantId"],
    properties: {
        tenantId: { type: "string", description: "Unique tenant id" },
    },
} as const;

/**
 * Encapsulates payment routes (Stripe Connect onboarding + checkout).
 * Registered behind requireTenantAuth; account routes additionally require admin.
 */
async function routes(server: FastifyInstance, options: Record<string, unknown>) {
    server.post<{ Params: PaymentsRouteParams }>("/tenants/:tenantId/stripe/account", {
        preHandler: requireAdmin,
        schema: {
            description: "Creates the tenant's Stripe Express account if missing and returns a fresh onboarding link",
            tags: ["Payments"],
            params: tenantParamsSchema,
            response: {
                200: {
                    description: "Onboarding link created",
                    type: "object",
                    properties: { url: { type: "string" } },
                },
                500: {
                    description: "Onboarding link not created",
                    type: "object",
                    properties: { message: { type: "string" } },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.params;
        try {
            reply.send(await paymentsController.createOnboardingLink(tenantId));
        } catch (err) {
            request.log.error(err);
            reply.status(500).send({ message: `Error creating Stripe onboarding link for tenant ${tenantId}` });
        }
    });

    server.get<{ Params: PaymentsRouteParams }>("/tenants/:tenantId/stripe/account", {
        preHandler: requireAdmin,
        schema: {
            description: "Returns the tenant's Stripe Connect onboarding status",
            tags: ["Payments"],
            params: tenantParamsSchema,
            response: {
                200: {
                    description: "Account status",
                    type: "object",
                    properties: {
                        hasAccount: { type: "boolean" },
                        chargesEnabled: { type: "boolean" },
                    },
                },
                500: {
                    description: "Status lookup failed",
                    type: "object",
                    properties: { message: { type: "string" } },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.params;
        try {
            reply.send(await paymentsController.getAccountStatus(tenantId));
        } catch (err) {
            request.log.error(err);
            reply.status(500).send({ message: `Error fetching Stripe account status for tenant ${tenantId}` });
        }
    });

    server.post<{ Params: PaymentsRouteParams, Body: CreateCheckoutBody }>("/tenants/:tenantId/checkout", {
        schema: {
            description: "Creates a Stripe Checkout session (direct charge on the tenant's connected account)",
            tags: ["Payments"],
            params: tenantParamsSchema,
            body: {
                type: "object",
                required: ["paymentItemId"],
                properties: {
                    paymentItemId: { type: "integer" },
                },
            },
            response: {
                200: {
                    description: "Checkout session created",
                    type: "object",
                    properties: {
                        url: { type: "string", nullable: true },
                        sessionId: { type: "string" },
                    },
                },
                409: {
                    description: "Tenant has not completed Stripe onboarding",
                    type: "object",
                    properties: { message: { type: "string" } },
                },
                500: {
                    description: "Checkout session not created",
                    type: "object",
                    properties: { message: { type: "string" } },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.params;
        const { paymentItemId } = request.body;
        try {
            const result = await paymentsController.createCheckoutSession(tenantId, request.authUser!.id, paymentItemId);
            reply.send(result);
        } catch (err) {
            if (err instanceof PaymentsNotEnabledError) {
                return reply.status(409).send({ message: err.message });
            }
            request.log.error(err);
            reply.status(500).send({ message: `Error creating checkout session for tenant ${tenantId}` });
        }
    });
}

export default routes;
