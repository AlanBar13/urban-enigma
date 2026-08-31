import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest, FastifyReply } from "fastify";
import SupaClient from "../../lib/db/client.js";

declare module "fastify" {
    interface FastifyRequest {
        authUser?: { id: string; role: string };
    }
}

const jwksUrl = process.env.SUPABASE_JWKS_URL
    ?? `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const jwks = createRemoteJWKSet(new URL(jwksUrl)); // caches keys in-process

/**
 * Verifies the Supabase JWT and returns its subject. Returns null having already
 * replied 401 — callers must `return` immediately when they get null.
 */
async function verifiedSub(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const token = request.headers.authorization?.replace(/^Bearer /, "");
    if (!token) {
        reply.status(401).send({ success: false, message: "Missing token" });
        return null;
    }

    let sub: string | undefined;
    try {
        ({ payload: { sub } } = await jwtVerify(token, jwks));
    } catch {
        reply.status(401).send({ success: false, message: "Invalid token" });
        return null;
    }
    if (!sub) {
        reply.status(401).send({ success: false, message: "Invalid token" });
        return null;
    }
    return sub;
}

export async function requireTenantAuth(request: FastifyRequest, reply: FastifyReply) {
    const sub = await verifiedSub(request, reply);
    if (!sub) return;

    const { tenantId } = request.params as { tenantId?: string };
    const supabase = SupaClient.getInstance().getSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", sub)
        .single();
    // ponytail: one profiles query per request; cache by sub if traffic ever matters
    // ponytail: home tenant only — the web app also honours `tenant_admins` grants
    // (fraccio-web/src/lib/auth.ts). Add the same lookup here when a multi-tenant
    // admin actually needs the WhatsApp routes (currently disabled in the UI).
    if (!profile || (profile.role !== "superadmin" && profile.tenant_id !== tenantId)) {
        return reply.status(403).send({ success: false, message: "Forbidden" });
    }

    request.authUser = { id: sub, role: profile.role };
}

/**
 * Group-level preHandler for platform-wide routes that have no `:tenantId`.
 *
 * Do NOT rely on requireTenantAuth for these: on a param-less route its
 * `profile.tenant_id !== tenantId` check happens to reject non-superadmins
 * (tenantId is undefined), but that is a side effect, not a contract. Routes
 * exposing company-wide data get an explicit check.
 */
export async function requireSuperadmin(request: FastifyRequest, reply: FastifyReply) {
    const sub = await verifiedSub(request, reply);
    if (!sub) return;

    const supabase = SupaClient.getInstance().getSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sub)
        .single();
    // Role comes from the profiles table, never from the token.
    if (profile?.role !== "superadmin") {
        return reply.status(403).send({ success: false, message: "Superadmin access required" });
    }

    request.authUser = { id: sub, role: profile.role };
}

/** Route-level preHandler; runs after the group-level requireTenantAuth hook, so authUser is set. */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    const role = request.authUser?.role;
    if (role !== "admin" && role !== "superadmin") {
        return reply.status(403).send({ success: false, message: "Admin access required" });
    }
}
