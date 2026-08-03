import { sendEmail } from "../../lib/mailgun.js";
import SupaClient from "../../lib/db/client.js";

/** Thrown when the tenant doesn't have the email feature enabled; routes map it to 409. */
export class EmailNotEnabledError extends Error {
    constructor() {
        super("El fraccionamiento no tiene email habilitado");
    }
}

class EmailController {
    private get supabase() {
        return SupaClient.getInstance().getSupabase();
    }

    private async getTenant(tenantId: string) {
        const { data: tenant, error } = await this.supabase
            .from("tenants")
            .select("id, name, path, features")
            .eq("id", tenantId)
            .single();
        if (error || !tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }
        return tenant;
    }

    /**
     * Emails the invite's accept link to the invitee. The recipient address
     * always comes from the invites row (scoped to the tenant) — never from
     * the caller — so cross-tenant sends are impossible.
     */
    async sendInviteEmail(tenantId: string, inviteId: string): Promise<void> {
        const { data: invite, error } = await this.supabase
            .from("invites")
            .select("id, email, name")
            .eq("id", inviteId)
            .eq("tenant_id", tenantId)
            .single();
        if (error || !invite) {
            throw new Error(`Invite ${inviteId} not found for tenant ${tenantId}`);
        }

        const tenant = await this.getTenant(tenantId);
        await sendEmail({
            to: [invite.email],
            subject: `Invitación a ${tenant.name}`,
            template: "fraccio invite",
            variables: {
                name: invite.name,
                tenant_name: tenant.name,
                invite_link: `${process.env.WEB_BASE_URL}/accept-invite?token=${invite.id}`,
            },
        });
    }

    /**
     * Emails an announcement to every user of the tenant (or only house owners).
     * Recipients are resolved server-side from profiles by tenant_id — a
     * recipient list is never accepted from the client.
     */
    async sendAnnouncementEmail(
        tenantId: string,
        input: { title: string; description?: string | undefined; ownersOnly: boolean },
    ): Promise<{ sent: number }> {
        const tenant = await this.getTenant(tenantId);
        const features = tenant.features as Record<string, boolean> | null;
        if (features?.email !== true) {
            throw new EmailNotEnabledError();
        }

        const { data: profiles, error } = await this.supabase
            .from("profiles")
            .select("id, email, full_name")
            .eq("tenant_id", tenantId);
        if (error) {
            throw new Error(`Failed to load profiles for tenant ${tenantId}: ${error.message}`);
        }

        let recipients = (profiles ?? []).filter((p) => p.email);
        if (input.ownersOnly && recipients.length > 0) {
            const { data: owners, error: ownersError } = await this.supabase
                .from("house_owners")
                .select("user_id")
                .in("user_id", recipients.map((p) => p.id));
            if (ownersError) {
                throw new Error(`Failed to load house owners for tenant ${tenantId}: ${ownersError.message}`);
            }
            const ownerIds = new Set((owners ?? []).map((o) => o.user_id));
            recipients = recipients.filter((p) => ownerIds.has(p.id));
        }
        if (recipients.length === 0) {
            return { sent: 0 };
        }

        // ponytail: synchronous send; move to BullMQ if tenants outgrow a few thousand recipients
        for (let i = 0; i < recipients.length; i += 1000) {
            const chunk = recipients.slice(i, i + 1000);
            await sendEmail({
                to: chunk.map((p) => p.email as string),
                subject: `${tenant.name}: ${input.title}`,
                template: "announcement fraccio",
                variables: {
                    name: "%recipient.name%",
                    tenant_name: tenant.name,
                    title: input.title,
                    description: input.description || input.title,
                    announcement_link: `${process.env.WEB_BASE_URL}/${tenant.path}/anuncios`,
                },
                // Batch mode: each recipient sees only their own address in To:
                recipientVariables: Object.fromEntries(
                    chunk.map((p) => [p.email as string, { name: p.full_name ?? "" }]),
                ),
            });
        }
        return { sent: recipients.length };
    }
}

export const emailController = new EmailController();
