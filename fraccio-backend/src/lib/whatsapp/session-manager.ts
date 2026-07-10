import type { SupabaseClient } from "@supabase/supabase-js";
import SupabaseClientSingleton from "../db/client.js";
import { WhatsAppClient } from "./client.js";

export type WhatsAppSessionStatus = "pending_qr" | "connecting" | "ready" | "error" | "disconnected";

export interface WhatsAppSession {
    id: string;
    tenant_id: string;
    client_id: string;
    status: WhatsAppSessionStatus;
    qr_code: string | null;
    connected_phone: string | null;
    group_id: string | null;
    error_message: string | null;
    last_seen_at: string | null;
    created_at: string;
    updated_at: string;
}

export class WhatsAppSessionManager {
    private supabase: SupabaseClient;
    private clients = new Map<string, WhatsAppClient>();
    private initializingClients = new Map<string, Promise<WhatsAppClient>>();

    constructor(supabaseClient?: SupabaseClient) {
        this.supabase = supabaseClient ?? SupabaseClientSingleton.getInstance().getSupabase();
    }

    private normalizeTenantId(tenantId: string): string {
        return tenantId.trim();
    }

    private async initializeClientForTenant(tenantId: string, session: WhatsAppSession): Promise<WhatsAppClient> {
        const existingClient = this.clients.get(tenantId);
        if (existingClient) {
            return existingClient;
        }

        const pendingInitialization = this.initializingClients.get(tenantId);
        if (pendingInitialization) {
            return pendingInitialization;
        }

        const initializationPromise = (async () => {
            await this.updateSession(tenantId, {
                status: "connecting",
                error_message: null,
            });

            const client = new WhatsAppClient(session.client_id, {
                onQr: async (qr) => {
                    await this.updateSession(tenantId, {
                        status: "pending_qr",
                        qr_code: qr,
                        error_message: null,
                    });
                },
                onReady: async (phone) => {
                    await this.updateSession(tenantId, {
                        status: "ready",
                        qr_code: null,
                        connected_phone: phone || null,
                        error_message: null,
                    });
                },
                onError: async (message) => {
                    await this.updateSession(tenantId, {
                        status: "error",
                        error_message: message,
                    });
                },
                onDisconnected: async () => {
                    const liveClient = this.clients.get(tenantId);
                    this.clients.delete(tenantId);
                    if (liveClient) {
                        await liveClient.destroy().catch(() => undefined);
                    }
                    await this.updateSession(tenantId, {
                        status: "disconnected",
                        qr_code: null,
                        connected_phone: null,
                    });
                },
            });

            await client.initialize();
            this.clients.set(tenantId, client);
            return client;
        })();

        this.initializingClients.set(tenantId, initializationPromise);

        try {
            return await initializationPromise;
        } finally {
            this.initializingClients.delete(tenantId);
        }
    }

    async ensureSession(tenantId: string): Promise<WhatsAppSession> {
        const normalizedTenantId = this.normalizeTenantId(tenantId);
        let session = await this.getSession(normalizedTenantId);

        if (!session) {
            const clientId = `tenant-${normalizedTenantId}`;
            const { data, error } = await this.supabase
                .from("whatsapp_sessions")
                .insert({
                    tenant_id: normalizedTenantId,
                    client_id: clientId,
                    status: "pending_qr",
                    qr_code: null,
                    connected_phone: null,
                    error_message: null,
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            session = data as WhatsAppSession;
        }

        return session;
    }

    async getSession(tenantId: string): Promise<WhatsAppSession | null> {
        const { data, error } = await this.supabase
            .from("whatsapp_sessions")
            .select("*")
            .eq("tenant_id", this.normalizeTenantId(tenantId))
            .maybeSingle();

        if (error) {
            throw error;
        }

        return (data as WhatsAppSession | null) ?? null;
    }

    async getQrCode(tenantId: string): Promise<string | null> {
        const session = await this.getSession(tenantId);
        return session?.qr_code ?? null;
    }

    async updateSession(tenantId: string, updates: Partial<WhatsAppSession>): Promise<WhatsAppSession> {
        const normalizedTenantId = this.normalizeTenantId(tenantId);
        const { data, error } = await this.supabase
            .from("whatsapp_sessions")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("tenant_id", normalizedTenantId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data as WhatsAppSession;
    }

    /**
     * Returns the tenant's live client, lazily initializing it. By default waits
     * until the WhatsApp session is actually usable (`ready` event); pass
     * `waitReady: false` for flows where readiness depends on the user scanning
     * a QR code (initial linking).
     */
    async getClient(tenantId: string, waitReady = true): Promise<WhatsAppClient> {
        const normalizedTenantId = this.normalizeTenantId(tenantId);
        let client = this.clients.get(normalizedTenantId);

        if (!client) {
            const session = await this.ensureSession(normalizedTenantId);
            client = await this.initializeClientForTenant(normalizedTenantId, session);
        }

        if (waitReady) {
            await client.waitUntilReady();
        }

        return client;
    }

    async disconnectClient(tenantId: string): Promise<WhatsAppSession> {
        const normalizedTenantId = this.normalizeTenantId(tenantId);
        const client = this.clients.get(normalizedTenantId);

        if (client) {
            this.clients.delete(normalizedTenantId);
            // logout throws if the session never authenticated; destroy regardless.
            await client.logout().catch(() => undefined);
            await client.destroy().catch(() => undefined);
        }

        return this.updateSession(normalizedTenantId, {
            status: "disconnected",
            qr_code: null,
            connected_phone: null,
            error_message: null,
        });
    }
}

export const whatsappSessionManager = new WhatsAppSessionManager();
