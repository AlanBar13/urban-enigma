import { type FastifyInstance } from "fastify";
import { emailController, EmailNotEnabledError } from "../controllers/email.controller.js";
import { requireAdmin } from "../plugins/auth.js";

interface EmailRouteParams {
    tenantId: string;
}

interface InviteEmailBody {
    inviteId: string;
}

interface AnnouncementEmailBody {
    title: string;
    description?: string;
    ownersOnly?: boolean;
}

const tenantParamsSchema = {
    type: "object",
    required: ["tenantId"],
    properties: {
        tenantId: { type: "string", description: "Unique tenant id" },
    },
} as const;

/**
 * Encapsulates email routes (Mailgun). Registered behind requireTenantAuth;
 * recipients are always resolved server-side from the DB, never from the body.
 */
async function routes(server: FastifyInstance, options: Record<string, unknown>) {
    // No requireAdmin: household invites are sent by house owners without the admin role.
    server.post<{ Params: EmailRouteParams, Body: InviteEmailBody }>("/tenants/:tenantId/invite", {
        schema: {
            description: "Emails the accept link for an existing invite of this tenant",
            tags: ["Email"],
            params: tenantParamsSchema,
            body: {
                type: "object",
                required: ["inviteId"],
                properties: {
                    inviteId: { type: "string" },
                },
            },
            response: {
                200: {
                    description: "Invite email sent",
                    type: "object",
                    properties: { sent: { type: "boolean" } },
                },
                500: {
                    description: "Invite email not sent",
                    type: "object",
                    properties: { message: { type: "string" } },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.params;
        try {
            await emailController.sendInviteEmail(tenantId, request.body.inviteId);
            reply.send({ sent: true });
        } catch (err) {
            request.log.error(err);
            reply.status(500).send({ message: `Error sending invite email for tenant ${tenantId}` });
        }
    });

    server.post<{ Params: EmailRouteParams, Body: AnnouncementEmailBody }>("/tenants/:tenantId/announcements", {
        preHandler: requireAdmin,
        schema: {
            description: "Emails an announcement to all tenant users (or only house owners)",
            tags: ["Email"],
            params: tenantParamsSchema,
            body: {
                type: "object",
                required: ["title"],
                properties: {
                    title: { type: "string", minLength: 3 },
                    description: { type: "string" },
                    ownersOnly: { type: "boolean", default: false },
                },
            },
            response: {
                200: {
                    description: "Announcement emails sent",
                    type: "object",
                    properties: { sent: { type: "integer" } },
                },
                409: {
                    description: "Tenant does not have the email feature enabled",
                    type: "object",
                    properties: { message: { type: "string" } },
                },
                500: {
                    description: "Announcement emails not sent",
                    type: "object",
                    properties: { message: { type: "string" } },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.params;
        const { title, description, ownersOnly } = request.body;
        try {
            const result = await emailController.sendAnnouncementEmail(tenantId, {
                title,
                description,
                ownersOnly: ownersOnly ?? false,
            });
            reply.send(result);
        } catch (err) {
            if (err instanceof EmailNotEnabledError) {
                return reply.status(409).send({ message: err.message });
            }
            request.log.error(err);
            reply.status(500).send({ message: `Error sending announcement email for tenant ${tenantId}` });
        }
    });
}

export default routes;
