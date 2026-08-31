import { type FastifyInstance } from "fastify";
import { getStripe } from "../../lib/stripe.js";
import { billingController } from "../controllers/billing.controller.js";

/**
 * Stripe PLATFORM webhook for the SaaS subscription (no auth — signature-verified).
 * Configure this endpoint to listen to events on YOUR account, not on connected
 * accounts — that is what separates it from stripe-webhook.route.ts.
 */
async function routes(server: FastifyInstance, options: Record<string, unknown>) {
    // Raw body needed for signature verification. Content type parsers are
    // encapsulated per plugin context and this file is registered as a plain
    // async function (never fastify-plugin), so it gets its own child context
    // and does not collide with the Connect webhook's identical parser.
    server.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
        done(null, body);
    });

    server.post("/webhooks/stripe/billing", {
        schema: {
            description: "Stripe platform webhook for SaaS subscriptions (signature-verified)",
            tags: ["Billing"],
        },
    }, async (request, reply) => {
        const signature = request.headers["stripe-signature"];
        const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
        if (!webhookSecret) {
            request.log.error("STRIPE_BILLING_WEBHOOK_SECRET is not configured");
            return reply.status(500).send({ message: "Webhook secret not configured" });
        }
        if (typeof signature !== "string") {
            return reply.status(400).send({ message: "No signature" });
        }

        let event;
        try {
            event = getStripe().webhooks.constructEvent(request.body as Buffer, signature, webhookSecret);
        } catch (err) {
            request.log.error(err, "Billing webhook signature verification failed");
            return reply.status(400).send({ message: "Invalid signature" });
        }

        try {
            await billingController.handleBillingWebhookEvent(event);
            reply.send({ received: true });
        } catch (err) {
            request.log.error(err, `Error processing billing webhook event ${event.type}`);
            reply.status(500).send({ message: "Error processing webhook" });
        }
    });
}

export default routes;
