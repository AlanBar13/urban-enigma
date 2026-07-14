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

export async function requireTenantAuth(request: FastifyRequest, reply: FastifyReply) {
    const token = request.headers.authorization?.replace(/^Bearer /, "");
    if (!token) {
        return reply.status(401).send({ success: false, message: "Missing token" });
    }

    let sub: string | undefined;
    try {
        ({ payload: { sub } } = await jwtVerify(token, jwks));
    } catch {
        return reply.status(401).send({ success: false, message: "Invalid token" });
    }
    if (!sub) {
        return reply.status(401).send({ success: false, message: "Invalid token" });
    }

    const { tenantId } = request.params as { tenantId?: string };
    const supabase = SupaClient.getInstance().getSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", sub)
        .single();
    // ponytail: one profiles query per request; cache by sub if traffic ever matters
    if (!profile || (profile.role !== "superadmin" && profile.tenant_id !== tenantId)) {
        return reply.status(403).send({ success: false, message: "Forbidden" });
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
