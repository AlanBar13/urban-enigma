import type Stripe from "stripe";
import { getStripe } from "../../lib/stripe.js";
import SupaClient from "../../lib/db/client.js";

/**
 * SaaS subscription billing — the fraccionamiento paying US a monthly fee.
 *
 * Runs on the PLATFORM account: every call here uses `getStripe()` with no
 * `{ stripeAccount }`. Do not reuse `tenants.stripe_account_id` — that is the
 * tenant's *connected* account (residents paying the HOA), the opposite
 * direction of money, and it is not a customer.
 */

export type PlanName = "arranque" | "basico" | "esencial" | "pro";

/** Our per-transaction commission, in whole MXN. The one source of truth. */
export const PLAN_FEE_MXN: Record<PlanName, number> = {
    arranque: 10,
    basico: 8,
    esencial: 5,
    pro: 2,
};

/**
 * Prices live in the Stripe Dashboard as plain recurring monthly prices — one
 * flat amount per plan, quantity always 1. House limits are a hard cap enforced
 * when a house is created (PLAN_MAX_HOUSES in fraccio-web/src/lib/tenants.ts),
 * so there is no overage to bill and no tiered pricing to configure.
 * Arranque is free — no price, no subscription.
 */
const PLAN_PRICE_ENV: Record<Exclude<PlanName, "arranque">, string> = {
    basico: "STRIPE_PRICE_BASICO",
    esencial: "STRIPE_PRICE_ESENCIAL",
    pro: "STRIPE_PRICE_PRO",
};

/** Thrown when a paid plan has no Price configured; routes map it to 409. */
export class PlanNotBillableError extends Error {
    constructor(plan: string) {
        super(`El plan ${plan} no se puede contratar en línea`);
    }
}

/** Thrown when an action needs an existing subscription and there is none. */
export class NoSubscriptionError extends Error {
    constructor() {
        super("El fraccionamiento no tiene una suscripción activa");
    }
}

class BillingController {
    private get supabase() {
        return SupaClient.getInstance().getSupabase();
    }

    private async getTenant(tenantId: string) {
        const { data: tenant, error } = await this.supabase
            .from("tenants")
            .select("id, name, path, plan, stripe_customer_id, stripe_subscription_id, subscription_status")
            .eq("id", tenantId)
            .single();
        if (error || !tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }
        return tenant;
    }

    /** Shown in the UI against the plan's hard cap. Not a billing quantity — pricing is flat. */
    private async getHouseCount(tenantId: string): Promise<number> {
        const { count, error } = await this.supabase
            .from("houses")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId);
        if (error) {
            throw new Error(`Failed to count houses for tenant ${tenantId}: ${error.message}`);
        }
        return count ?? 0;
    }

    /** Creates the platform Customer on first use and remembers it. */
    private async getCustomerId(tenant: { id: string; name: string; stripe_customer_id: string | null }): Promise<string> {
        if (tenant.stripe_customer_id) {
            return tenant.stripe_customer_id;
        }

        const customer = await getStripe().customers.create({
            name: tenant.name,
            metadata: { tenant_id: tenant.id },
        });
        const { error } = await this.supabase
            .from("tenants")
            .update({ stripe_customer_id: customer.id })
            .eq("id", tenant.id);
        if (error) {
            throw new Error(`Failed to store stripe_customer_id for tenant ${tenant.id}: ${error.message}`);
        }
        return customer.id;
    }

    /** Checkout session for a paid plan. The webhook is what writes the plan back. */
    async createSubscriptionCheckout(tenantId: string, plan: PlanName): Promise<{ url: string | null }> {
        if (plan === "arranque") {
            throw new PlanNotBillableError(plan);
        }
        const price = process.env[PLAN_PRICE_ENV[plan]];
        if (!price) {
            throw new PlanNotBillableError(plan);
        }

        const tenant = await this.getTenant(tenantId);
        const customer = await this.getCustomerId(tenant);
        const adminUrl = `${process.env.WEB_BASE_URL}/${tenant.path}/admin-pagos`;

        const session = await getStripe().checkout.sessions.create({
            mode: "subscription",
            customer,
            // Flat monthly price — the plan's house limit is a hard cap, not a
            // billed quantity, so this is always 1.
            line_items: [{ price, quantity: 1 }],
            // The subscription carries these so the webhook can identify the
            // tenant without a lookup table.
            subscription_data: { metadata: { tenant_id: tenantId, plan } },
            success_url: `${adminUrl}?suscripcion=ok`,
            cancel_url: adminUrl,
        });
        return { url: session.url };
    }

    /** Stripe's own portal handles cancelling, card changes and invoices — we build none of that. */
    async createPortalSession(tenantId: string): Promise<{ url: string }> {
        const tenant = await this.getTenant(tenantId);
        if (!tenant.stripe_customer_id) {
            throw new NoSubscriptionError();
        }

        const session = await getStripe().billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: `${process.env.WEB_BASE_URL}/${tenant.path}/admin-pagos`,
        });
        return { url: session.url };
    }

    /**
     * Current plan + subscription state, and how many houses the tenant has.
     *
     * Re-syncs subscription_status from Stripe on every read, the same way
     * payments' getAccountStatus() does, in case a webhook was missed.
     */
    async getSubscriptionStatus(tenantId: string): Promise<{
        plan: string;
        status: string | null;
        houseCount: number;
        feeMxn: number;
        currentPeriodEnd: number | null;
    }> {
        const tenant = await this.getTenant(tenantId);
        const houseCount = await this.getHouseCount(tenantId);
        const base = {
            plan: tenant.plan as string,
            houseCount,
            feeMxn: PLAN_FEE_MXN[tenant.plan as PlanName] ?? Number(process.env.PLATFORM_FEE_MXN ?? 0),
        };

        if (!tenant.stripe_subscription_id) {
            return { ...base, status: tenant.subscription_status, currentPeriodEnd: null };
        }

        const subscription = await getStripe().subscriptions.retrieve(tenant.stripe_subscription_id);
        const item = subscription.items.data[0];

        if (subscription.status !== tenant.subscription_status) {
            await this.supabase
                .from("tenants")
                .update({ subscription_status: subscription.status })
                .eq("id", tenantId);
        }

        return {
            ...base,
            status: subscription.status,
            // current_period_end lives on the subscription item in current API
            // versions; the client pins none, so read it from there.
            currentPeriodEnd: item?.current_period_end ?? null,
        };
    }

    /**
     * Platform (non-Connect) webhook events for the SaaS subscription.
     *
     * The tenant is found via `subscription.metadata.tenant_id`, stamped at
     * checkout, so no lookup table is needed.
     */
    async handleBillingWebhookEvent(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
                const subscription = event.data.object;
                const tenantId = subscription.metadata.tenant_id;
                if (!tenantId) break;

                const deleted = event.type === "customer.subscription.deleted";
                const { error } = await this.supabase
                    .from("tenants")
                    .update({
                        subscription_status: subscription.status,
                        stripe_subscription_id: deleted ? null : subscription.id,
                        // Losing the subscription drops them back to the free
                        // plan — and back to the $10 commission — rather than
                        // leaving them on a paid plan nobody is paying for.
                        ...(deleted
                            ? { plan: "arranque" }
                            : subscription.metadata.plan
                              ? { plan: subscription.metadata.plan }
                              : {}),
                    })
                    .eq("id", tenantId);
                if (error) {
                    throw new Error(`Failed to sync subscription for tenant ${tenantId}: ${error.message}`);
                }
                break;
            }

            case "invoice.payment_failed": {
                // Stripe keeps retrying and will emit subscription.updated when
                // it gives up; this only surfaces the warning banner sooner.
                const invoice = event.data.object;
                if (!invoice.customer) break;
                await this.supabase
                    .from("tenants")
                    .update({ subscription_status: "past_due" })
                    .eq("stripe_customer_id", invoice.customer as string);
                break;
            }

            default:
                break;
        }
    }
}

export const billingController = new BillingController();
