import Stripe from "stripe";

let stripe: Stripe | undefined;

/** Lazy singleton; uses the API version pinned by the installed SDK. */
export function getStripe(): Stripe {
    if (!stripe) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error("STRIPE_SECRET_KEY is not configured");
        }
        stripe = new Stripe(secretKey);
    }
    return stripe;
}
