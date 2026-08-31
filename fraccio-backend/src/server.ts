import "dotenv/config"
import Fastify from "fastify";
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import supabasePlugin from "./lib/db/plugin.js";
import { requireSuperadmin, requireTenantAuth } from "./api/plugins/auth.js";
import baseRoutes from "./api/routes/base.route.js";
// TEMP: WhatsApp disabled — 2026-07-27
// import commsRoutes from "./api/routes/comms.route.js";
// import whatsappSessionRoutes from "./api/routes/whatsapp-session.route.js";
import paymentsRoutes from "./api/routes/payments.route.js";
import stripeWebhookRoutes from "./api/routes/stripe-webhook.route.js";
import stripeBillingWebhookRoutes from "./api/routes/stripe-billing-webhook.route.js";
import billingRoutes from "./api/routes/billing.route.js";
import adminRoutes from "./api/routes/admin.route.js";
import emailRoutes from "./api/routes/email.route.js";

const server = Fastify({
    logger: true
});

server.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'Fraccio API',
            description: 'API documentation for Fraccio',
            version: '1.0.0'
        },
        servers: [{ url: 'http://localhost:5000' }]
    }
})

server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: true
    }
})

server.register(supabasePlugin);

server.register(async (instance) => {
    instance.register(baseRoutes);
    instance.register(stripeWebhookRoutes); // no auth — Stripe signature-verified
    // Separate register() = separate context, so its raw-body parser does not
    // clash with the Connect webhook's. Never wrap either in fastify-plugin.
    instance.register(stripeBillingWebhookRoutes);
    // TEMP: WhatsApp disabled — 2026-07-27
    // instance.register(async (comms) => {
    //     comms.addHook("preHandler", requireTenantAuth);
    //     comms.register(commsRoutes);
    //     comms.register(whatsappSessionRoutes);
    // }, { prefix: "/comms" });
    instance.register(async (payments) => {
        payments.addHook("preHandler", requireTenantAuth);
        payments.register(paymentsRoutes);
    }, { prefix: "/payments" });
    instance.register(async (billing) => {
        billing.addHook("preHandler", requireTenantAuth);
        billing.register(billingRoutes);
    }, { prefix: "/billing" });
    // Platform-wide, no :tenantId — hence its own explicit superadmin guard
    // rather than requireTenantAuth, whose param-less behaviour is incidental.
    instance.register(async (admin) => {
        admin.addHook("preHandler", requireSuperadmin);
        admin.register(adminRoutes);
    }, { prefix: "/admin" });
    instance.register(async (email) => {
        email.addHook("preHandler", requireTenantAuth);
        email.register(emailRoutes);
    }, { prefix: "/email" });
}, { prefix: "/api/v1" })

server.listen({ port: Number(process.env.PORT) || 5000, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
});