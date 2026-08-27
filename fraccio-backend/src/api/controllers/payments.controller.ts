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
     *
     * Two entry points, one session — neither writes a `pending` row:
     *  - `paymentId` — settling an existing cargo (a generated cuota). The row
     *    already exists, so it is reused; inserting here would leave the house
     *    still owing the original charge after paying.
     *  - `paymentItemId` — a one-off concept. Nothing is stored until the
     *    webhook says paid or failed, so an abandoned checkout leaves no trace.
     *    The row's fields ride along in the session metadata instead.
     *
     * Amount always comes from the DB row — never from the client, in either path.
     */
    async createCheckoutSession(
        tenantId: string,
        userId: string,
        paymentItemId?: number,
        paymentId?: number,
    ): Promise<{ url: string | null; sessionId: string }> {
        const stripe = getStripe();
        const tenant = await this.getTenant(tenantId);
        if (!tenant.stripe_account_id || !tenant.stripe_charges_enabled) {
            throw new PaymentsNotEnabledError();
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

        let amount: number;
        let lineName: string;
        let lineDescription: string | undefined;
        // Everything the webhook needs. The cargo path points at an existing row;
        // the concepto path carries the row it will have to create.
        let metadata: Record<string, string>;

        if (paymentId) {
            // Scoped to the caller's own house, so a resident cannot open a
            // checkout against a neighbour's cargo.
            const { data: charge, error: chargeError } = await this.supabase
                .from("payments")
                .select("id, amount, description")
                .eq("id", paymentId)
                .eq("tenant_id", tenantId)
                .eq("house_id", houseUser.house_id)
                .eq("status", "pending")
                .single();
            if (chargeError || !charge) {
                throw new Error("Charge not found or already settled");
            }
            amount = charge.amount;
            lineName = charge.description || "Cuota";
            lineDescription = undefined;
            metadata = {
                payment_id: charge.id.toString(),
                tenant_id: tenantId,
                user_id: userId,
                house_id: houseUser.house_id.toString(),
            };

            // Claim the cargo for whoever is paying it
            await this.supabase.from("payments").update({ user_id: userId }).eq("id", charge.id);
        } else {
            if (!paymentItemId) {
                throw new Error("Either paymentItemId or paymentId is required");
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

            // null assigned_user_ids = tenant-wide. The web only hides these items;
            // this is the check that actually prevents paying someone else's charge.
            if (paymentItem.assigned_user_ids && !paymentItem.assigned_user_ids.includes(userId)) {
                throw new Error("This payment is not assigned to you");
            }

            // No insert: the row is born in the webhook, already settled.
            amount = paymentItem.amount;
            lineName = paymentItem.name;
            lineDescription = paymentItem.description || undefined;
            metadata = {
                tenant_id: tenantId,
                user_id: userId,
                house_id: houseUser.house_id.toString(),
                // Lets the resident's /pagos page mark the concept as already paid
                payment_item_id: paymentItem.id.toString(),
                payment_type: paymentItem.payment_type,
                description: paymentItem.description || paymentItem.name,
            };
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
                                name: lineName,
                                ...(lineDescription ? { description: lineDescription } : {}),
                            },
                            unit_amount: Math.round(amount * 100),
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: {
                    application_fee_amount: Number(process.env.PLATFORM_FEE_MXN ?? 0) * 100,
                    // Copied onto the intent: payment_intent.* events never see
                    // the session's own metadata, and payment_failed is the only
                    // signal a concepto attempt existed at all.
                    metadata,
                },
                success_url: `${baseUrl}/pagos/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/pagos/cancel`,
                metadata,
            },
            { stripeAccount: tenant.stripe_account_id },
        );

        // Non-fatal: the webhook still finds the payment via metadata.payment_id.
        // Only the cargo path has a row to stamp — a concepto has none yet.
        if (paymentId) {
            await this.supabase
                .from("payments")
                .update({ stripe_session_id: session.id })
                .eq("id", paymentId);
        }

        return { url: session.url, sessionId: session.id };
    }

    /**
     * Writes the concepto row the checkout never created, keyed on the payment
     * intent so the two "it worked" events (checkout.session.completed and
     * payment_intent.succeeded) and Stripe's retries all land on one row.
     * A failed attempt later retried successfully collapses into one completed row.
     *
     * Amount comes from what Stripe actually charged, not from the metadata.
     */
    private async upsertConceptoPayment(
        metadata: Stripe.Metadata,
        intentId: string,
        status: "completed" | "failed",
        amountCents: number | null,
        sessionId?: string,
    ): Promise<void> {
        const { tenant_id, user_id, house_id, payment_item_id, payment_type, description } = metadata;
        if (!tenant_id || !user_id || !house_id) return;

        const { error } = await this.supabase.from("payments").upsert(
            {
                tenant_id,
                user_id,
                house_id: parseInt(house_id),
                payment_item_id: payment_item_id ? parseInt(payment_item_id) : null,
                amount: (amountCents ?? 0) / 100,
                currency: "mxn",
                status,
                payment_method: "stripe",
                payment_type: payment_type ?? "maintenance",
                description: description ?? null,
                stripe_payment_intent_id: intentId,
                ...(sessionId ? { stripe_session_id: sessionId } : {}),
            },
            { onConflict: "stripe_payment_intent_id" },
        );
        if (error) {
            throw new Error(`Failed to record payment for intent ${intentId}: ${error.message}`);
        }
    }

    /**
     * Handles Connect webhook events (fired on connected accounts for direct charges).
     *
     * `metadata.payment_id` present = a cargo, whose row already exists and is
     * only ever updated. Absent = a one-off concepto, whose row is created here
     * — an abandoned checkout fires none of these events and so stores nothing.
     *
     * ponytail: no event.account-vs-tenant cross-check — all accounts are
     * platform-created Express (holders have no API keys) and events are
     * signature-verified; add the check if non-Express accounts ever appear.
     */
    async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                // Anything short of paid is the state we no longer persist
                if (session.payment_status !== "paid") break;
                const intentId = session.payment_intent as string;

                if (session.metadata?.payment_id) {
                    const { error } = await this.supabase
                        .from("payments")
                        .update({ status: "completed", stripe_payment_intent_id: intentId })
                        .eq("id", parseInt(session.metadata.payment_id));
                    if (error) {
                        throw new Error(`Failed to update payment ${session.metadata.payment_id}: ${error.message}`);
                    }
                } else if (session.metadata) {
                    await this.upsertConceptoPayment(
                        session.metadata,
                        intentId,
                        "completed",
                        session.amount_total,
                        session.id,
                    );
                }
                break;
            }

            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                if (paymentIntent.metadata.payment_id) {
                    await this.supabase
                        .from("payments")
                        .update({ status: "completed" })
                        .eq("stripe_payment_intent_id", paymentIntent.id);
                } else {
                    await this.upsertConceptoPayment(
                        paymentIntent.metadata,
                        paymentIntent.id,
                        "completed",
                        paymentIntent.amount_received,
                    );
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object;
                // A cargo is a debt: a failed card attempt leaves it pending, still
                // owed and still in Morosidad. Marking it 'failed' would erase it.
                if (paymentIntent.metadata.payment_id) break;
                await this.upsertConceptoPayment(
                    paymentIntent.metadata,
                    paymentIntent.id,
                    "failed",
                    paymentIntent.amount,
                );
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
