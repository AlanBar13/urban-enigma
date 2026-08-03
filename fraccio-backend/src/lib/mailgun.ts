import Mailgun from "mailgun.js";

interface SendEmailParams {
    to: string[];
    subject: string;
    /** Name of a template stored in the Mailgun dashboard. */
    template: string;
    /** Handlebars variables for the template. Values may reference %recipient.x% when batch sending. */
    variables: Record<string, string>;
    /** Keyed by recipient email. Presence enables Mailgun batch mode: one individualized message per recipient. */
    recipientVariables?: Record<string, Record<string, string>>;
}

let client: ReturnType<Mailgun["client"]> | undefined;

/** Lazy singleton; throws if Mailgun is not configured. */
function getMailgun(): ReturnType<Mailgun["client"]> {
    if (!client) {
        const apiKey = process.env.MAILGUN_API_KEY;
        if (!apiKey) {
            throw new Error("MAILGUN_API_KEY is not configured");
        }
        // ponytail: US region default; pass url: "https://api.eu.mailgun.net" if EU is ever needed
        client = new Mailgun(FormData).client({ username: "api", key: apiKey });
    }
    return client;
}

/** Sends an email through Mailgun. Throws if Mailgun is not configured or the API rejects the send. */
export async function sendEmail(params: SendEmailParams): Promise<void> {
    const domain = process.env.MAILGUN_DOMAIN;
    const from = process.env.MAILGUN_FROM;
    if (!domain || !from) {
        throw new Error("MAILGUN_DOMAIN or MAILGUN_FROM is not configured");
    }
  
    await getMailgun().messages.create(domain, {
        from,
        to: params.to,
        subject: params.subject,
        template: params.template,
        "h:X-Mailgun-Variables": JSON.stringify(params.variables),
        ...(params.recipientVariables
            ? { "recipient-variables": JSON.stringify(params.recipientVariables) }
            : {}),
    });
}
