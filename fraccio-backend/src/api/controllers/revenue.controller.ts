import { getStripe } from "../../lib/stripe.js";
import SupaClient from "../../lib/db/client.js";

/**
 * Fraccio's own revenue, for the superadmin view. Two streams, both landing on
 * the PLATFORM account (so `getStripe()` with no `{ stripeAccount }`):
 *
 *  - subscriptions — paid `invoices` (the SaaS monthly fee the HOA pays us)
 *  - commissions   — `application_fee`s taken off each resident cuota
 *
 * Read live from Stripe; there is no local ledger on purpose. Stripe is already
 * the source of truth for money, and a second copy is a second number that can
 * disagree with it. What Stripe *can't* do is say which fraccionamiento an
 * `acct_`/`cus_` belongs to — that mapping is the point of this report.
 */

/** One fraccionamiento's contribution, in pesos. */
export interface TenantRevenue {
    tenantId: string | null;
    name: string;
    plan: string | null;
    subscriptions: number;
    commissions: number;
    total: number;
    paymentsCount: number;
}

export interface MonthlyRevenue {
    month: string;
    totals: { subscriptions: number; commissions: number; total: number };
    tenants: TenantRevenue[];
}

/** Rows whose Stripe account/customer matches no tenant. Never silently dropped. */
const UNASSIGNED = "Sin asignar";

class RevenueController {
    private get supabase() {
        return SupaClient.getInstance().getSupabase();
    }

    /**
     * UTC bounds for a `YYYY-MM` month, as epoch seconds.
     *
     * ponytail: UTC, not America/Mexico_City — a cuota paid 19:00 on Aug 31 CDMX
     * lands in September here. Switch to a tz-aware boundary if month-end
     * reconciliation ever needs to match a Mexican accountant's calendar.
     */
    private monthRange(month: string): { gte: number; lt: number } {
        const [year, mon] = month.split("-").map(Number);
        const start = Date.UTC(year!, mon! - 1, 1);
        const end = Date.UTC(year!, mon!, 1);
        return { gte: Math.floor(start / 1000), lt: Math.floor(end / 1000) };
    }

    async getMonthlyRevenue(month: string): Promise<MonthlyRevenue> {
        const { gte, lt } = this.monthRange(month);
        const stripe = getStripe();

        const { data: tenants, error } = await this.supabase
            .from("tenants")
            .select("id, name, plan, stripe_account_id, stripe_customer_id");
        if (error) {
            throw new Error(`Failed to load tenants: ${error.message}`);
        }

        // One bucket per tenant, plus a lazily-created one for unattributable rows.
        const buckets = new Map<string, TenantRevenue>();
        const byAccount = new Map<string, string>();
        const byCustomer = new Map<string, string>();

        for (const tenant of tenants ?? []) {
            buckets.set(tenant.id, {
                tenantId: tenant.id,
                name: tenant.name,
                plan: tenant.plan,
                subscriptions: 0,
                commissions: 0,
                total: 0,
                paymentsCount: 0,
            });
            if (tenant.stripe_account_id) byAccount.set(tenant.stripe_account_id, tenant.id);
            if (tenant.stripe_customer_id) byCustomer.set(tenant.stripe_customer_id, tenant.id);
        }

        const bucketFor = (tenantId: string | undefined): TenantRevenue => {
            const existing = tenantId && buckets.get(tenantId);
            if (existing) return existing;
            let unassigned = buckets.get(UNASSIGNED);
            if (!unassigned) {
                unassigned = {
                    tenantId: null,
                    name: UNASSIGNED,
                    plan: null,
                    subscriptions: 0,
                    commissions: 0,
                    total: 0,
                    paymentsCount: 0,
                };
                buckets.set(UNASSIGNED, unassigned);
            }
            return unassigned;
        };

        // ponytail: paginates all of Stripe on every request. Fine at this volume;
        // move to a stored ledger or Stripe Sigma if a month ever gets slow.
        for await (const invoice of stripe.invoices.list({
            status: "paid",
            created: { gte, lt },
            limit: 100,
        })) {
            // `created`, not paid-at: invoices.list can't filter on
            // status_transitions.paid_at, so an invoice created on the 31st and
            // paid on the 1st counts in the month it was created.
            const customer =
                typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
            const bucket = bucketFor(customer ? byCustomer.get(customer) : undefined);
            bucket.subscriptions += invoice.amount_paid / 100;
        }

        for await (const fee of stripe.applicationFees.list({
            created: { gte, lt },
            limit: 100,
        })) {
            const account = typeof fee.account === "string" ? fee.account : fee.account.id;
            const bucket = bucketFor(byAccount.get(account));
            // Net of refunds — a refunded commission is not revenue.
            bucket.commissions += (fee.amount - fee.amount_refunded) / 100;
            bucket.paymentsCount += 1;
        }

        // Tenants that contributed nothing are noise in a revenue report.
        const rows = [...buckets.values()]
            .map((row) => ({ ...row, total: row.subscriptions + row.commissions }))
            .filter((row) => row.total !== 0 || row.paymentsCount > 0)
            .sort((a, b) => b.total - a.total);

        return {
            month,
            totals: {
                subscriptions: rows.reduce((sum, r) => sum + r.subscriptions, 0),
                commissions: rows.reduce((sum, r) => sum + r.commissions, 0),
                total: rows.reduce((sum, r) => sum + r.total, 0),
            },
            tenants: rows,
        };
    }
}

export const revenueController = new RevenueController();
