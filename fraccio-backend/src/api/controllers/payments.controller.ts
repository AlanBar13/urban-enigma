import type Stripe from "stripe";
import { getStripe } from "../../lib/stripe.js";
import SupaClient from "../../lib/db/client.js";

/** Thrown when the tenant hasn't completed Stripe onboarding; routes map it to 409. */
export class PaymentsNotEnabledError extends Error {
    constructor() {
        super("El fraccionamiento no tiene pagos habilitados");
    }
}

class PaymentsController {
    private get supabase() {
        return SupaClient.getInstance().getSupabase();
    }

    private async getTenant(tenantId: string) {
        const { data: tenant, error } = await this.supabase
            .from("tenants")
            .select("id, name, path, stripe_account_id, stripe_charges_enabled")
            .eq("id", tenantId)
            .single();
        if (error || !tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }
        return tenant;
    }

    /**
     * Ensures the tenant has a Stripe Express connected account and mints a
     * fresh onboarding Account Link (links are single-use and short-lived).
     */
    async createOnboardingLink(tenantId: string): Promise<{ url: string }> {
        const stripe = getStripe();
        const tenant = await this.getTenant(tenantId);

        let accountId = tenant.stripe_account_id as string | null;
        if (!accountId) {
            // Accounts v2 SaaS defaults: tenant is merchant of record (direct
            // charges), Stripe collects its fees and owns negative-balance risk.
            const account = await stripe.v2.core.accounts.create({
                display_name: tenant.name,
                dashboard: "full",
                identity: { country: "mx" },
                defaults: {
                    currency: "mxn",
                    responsibilities: {
                        fees_collector: "stripe",
                        losses_collector: "stripe",
                    },
                },
                configuration: {
                    merchant: {
                        capabilities: { card_payments: { requested: true } },
                    },
                },
            });
            accountId = account.id;
            const { error } = await this.supabase
                .from("tenants")
                .update({ stripe_account_id: accountId })
                .eq("id", tenantId);
            if (error) {
                throw new Error(`Failed to store stripe_account_id for tenant ${tenantId}: ${error.message}`);
            }
        }

        const adminUrl = `${process.env.WEB_BASE_URL}/${tenant.path}/admin-pagos`;
        const link = await stripe.v2.core.accountLinks.create({
            account: accountId,
            use_case: {
                type: "account_onboarding",
                account_onboarding: {
                    configurations: ["merchant"],
                    refresh_url: adminUrl,
                    return_url: adminUrl,
                },
            },
        });
        return { url: link.url };
    }

    /** Onboarding status; re-syncs the DB flag in case an account.updated webhook was missed. */
    async getAccountStatus(tenantId: string): Promise<{ hasAccount: boolean; chargesEnabled: boolean }> {
        const tenant = await this.getTenant(tenantId);
        if (!tenant.stripe_account_id) {
            return { hasAccount: false, chargesEnabled: false };
        }

        const account = await getStripe().v2.core.accounts.retrieve(tenant.stripe_account_id, {
            include: ["configuration.merchant"],
        });
        const chargesEnabled =
            account.configuration?.merchant?.capabilities?.card_payments?.status === "active";
        if (chargesEnabled !== tenant.stripe_charges_enabled) {
            await this.supabase
                .from("tenants")
                .update({ stripe_charges_enabled: chargesEnabled })
                .eq("id", tenantId);
        }
        return { hasAccount: true, chargesEnabled };
    }

    /**
     * Creates a Stripe Checkout session as a direct charge on the tenant's
     * connected account, with the platform's fixed application fee.
     * Amount always comes from payment_items — never from the client.
     */
    async createCheckoutSession(tenantId: string, userId: string, paymentItemId: number): Promise<{ url: string | null; sessionId: string }> {
        const stripe = getStripe();
        const tenant = await this.getTenant(tenantId);
        if (!tenant.stripe_account_id || !tenant.stripe_charges_enabled) {
            throw new PaymentsNotEnabledError();
        }

        const { data: paymentItem, error: itemError } = await this.supabase
            .from("payment_items")
            .select("*")
            .eq("id", paymentItemId)
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .single();
        if (itemError || !paymentItem) {
            throw new Error("Payment item not found or inactive");
        }

        const { data: houseUser, error: houseError } = await this.supabase
            .from("house_users")
            .select("house_id, houses(tenant_id)")
            .eq("user_id", userId)
            .single();
        if (houseError || !houseUser) {
            throw new Error("You must be assigned to a house to make payments");
        }
        const house = houseUser.houses as unknown as { tenant_id: string };
        if (house.tenant_id !== tenantId) {
            throw new Error("Unauthorized: House does not belong to this tenant");
        }

        const { data: payment, error: paymentError } = await this.supabase
            .from("payments")
            .insert({
                tenant_id: tenantId,
                user_id: userId,
                house_id: houseUser.house_id,
                amount: paymentItem.amount,
                currency: paymentItem.currency,
                status: "pending",
                payment_type: paymentItem.payment_type,
                description: paymentItem.description || paymentItem.name,
            })
            .select()
            .single();
        if (paymentError || !payment) {
            throw new Error("Failed to create payment record");
        }

        const baseUrl = `${process.env.WEB_BASE_URL}/${tenant.path}`;
        const session = await stripe.checkout.sessions.create(
            {
                mode: "payment",
                // No payment_method_types: dynamic payment methods, configured in the Dashboard
                line_items: [
                    {
                        price_data: {
                            currency: "mxn",
                            product_data: {
                                name: paymentItem.name,
                                description: paymentItem.description || undefined,
                            },
                            unit_amount: Math.round(paymentItem.amount * 100),
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: {
                    application_fee_amount: Number(process.env.PLATFORM_FEE_MXN ?? 0) * 100,
                },
                success_url: `${baseUrl}/pagos/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/pagos/cancel`,
                metadata: {
                    payment_id: payment.id.toString(),
                    tenant_id: tenantId,
                    user_id: userId,
                    house_id: houseUser.house_id.toString(),
                },
            },
            { stripeAccount: tenant.stripe_account_id },
        );

        // Non-fatal: the webhook still finds the payment via metadata.payment_id
        await this.supabase
            .from("payments")
            .update({ stripe_session_id: session.id })
            .eq("id", payment.id);

        return { url: session.url, sessionId: session.id };
    }

    /**
     * Handles Connect webhook events (fired on connected accounts for direct charges).
     * ponytail: no event.account-vs-tenant cross-check — all accounts are
     * platform-created Express (holders have no API keys) and events are
     * signature-verified; add the check if non-Express accounts ever appear.
     */
    async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                if (!session.metadata?.payment_id) break;
                const { error } = await this.supabase
                    .from("payments")
                    .update({
                        status: session.payment_status === "paid" ? "completed" : "pending",
                        stripe_payment_intent_id: session.payment_intent as string,
                    })
                    .eq("id", parseInt(session.metadata.payment_id));
                if (error) {
                    throw new Error(`Failed to update payment ${session.metadata.payment_id}: ${error.message}`);
                }
                break;
            }

            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                await this.supabase
                    .from("payments")
                    .update({ status: "completed" })
                    .eq("stripe_payment_intent_id", paymentIntent.id);
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object;
                await this.supabase
                    .from("payments")
                    .update({ status: "failed" })
                    .eq("stripe_payment_intent_id", paymentIntent.id);
                break;
            }

            case "account.updated": {
                // ponytail: v1 compat event; v2 capability changes may not emit it.
                // getAccountStatus() re-syncs on every admin-pagos load either way.
                const account = event.data.object;
                await this.supabase
                    .from("tenants")
                    .update({ stripe_charges_enabled: account.charges_enabled })
                    .eq("stripe_account_id", account.id);
                break;
            }

            default:
                break;
        }
    }
}

export const paymentsController = new PaymentsController();
