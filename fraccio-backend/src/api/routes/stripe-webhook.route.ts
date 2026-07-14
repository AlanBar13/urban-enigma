import { type FastifyInstance } from "fastify";
import { getStripe } from "../../lib/stripe.js";
import { paymentsController } from "../controllers/payments.controller.js";

/**
 * Stripe Connect webhook (no auth — verified by signature instead).
 * The Stripe endpoint must be configured to listen to events on
 * CONNECTED accounts (direct charges fire there, plus account.updated).
 */
async function routes(server: FastifyInstance, options: Record<string, unknown>) {
    // Raw body needed for signature verification; parsers are encapsulated
    // per plugin context, so this only affects the webhook route.
    server.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
        done(null, body);
    });

    server.post("/webhooks/stripe", {
        schema: {
            description: "Stripe Connect webhook endpoint (signature-verified)",
            tags: ["Payments"],
        },
    }, async (request, reply) => {
        const signature = request.headers["stripe-signature"];
        const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
        if (!webhookSecret) {
            request.log.error("STRIPE_CONNECT_WEBHOOK_SECRET is not configured");
            return reply.status(500).send({ message: "Webhook secret not configured" });
        }
        if (typeof signature !== "string") {
            return reply.status(400).send({ message: "No signature" });
        }

        let event;
        try {
            event = getStripe().webhooks.constructEvent(request.body as Buffer, signature, webhookSecret);
        } catch (err) {
            request.log.error(err, "Webhook signature verification failed");
            return reply.status(400).send({ message: "Invalid signature" });
        }

        try {
            await paymentsController.handleWebhookEvent(event);
            reply.send({ received: true });
        } catch (err) {
            request.log.error(err, `Error processing webhook event ${event.type}`);
            reply.status(500).send({ message: "Error processing webhook" });
        }
    });
}

export default routes;
