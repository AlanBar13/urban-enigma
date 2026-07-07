import type { SupabaseClient } from "@supabase/supabase-js";
import SupabaseClientSingleton from "../db/client.js";
import { WhatsAppClient } from "./client.js";

export type WhatsAppSessionStatus = "pending_qr" | "connecting" | "ready" | "error";

export interface WhatsAppSession {
    id: string;
    tenant_id: string;
    client_id: string;
    status: WhatsAppSessionStatus;
    qr_code: string | null;
    connected_phone: string | null;
    error_message: string | null;
    last_seen_at: string | null;
    created_at: string;
    updated_at: string;
}

export class WhatsAppSessionManager {
    private supabase: SupabaseClient;
    private clients = new Map<string, WhatsAppClient>();
    private sessionsCache = new Map<string, WhatsAppSession>();
    private initializingClients = new Map<string, Promise<WhatsAppClient>>();

    constructor(supabaseClient?: SupabaseClient) {
        this.supabase = supabaseClient ?? SupabaseClientSingleton.getInstance().getSupabase();
    }

    private normalizeTenantId(tenantId: string): string {
        return tenantId.trim();
    }

    private async getExistingSession(tenantId: string): Promise<WhatsAppSession | null> {
        const { data, error } = await this.supabase
            .from("whatsapp_sessions")
            .select("*")
            .eq("tenant_id", tenantId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return (data as WhatsAppSession | null) ?? null;
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
                onReady: async () => {
                    await this.updateSession(tenantId, {
                        status: "ready",
                        qr_code: null,
                        error_message: null,
                    });
                },
                onError: async (message) => {
                    await this.updateSession(tenantId, {
                        status: "error",
                        error_message: message,
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
        const cachedSession = this.sessionsCache.get(normalizedTenantId);

        if (cachedSession) {
            return cachedSession;
        }

        let session = await this.getExistingSession(normalizedTenantId);

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

        this.sessionsCache.set(normalizedTenantId, session);
        return session;
    }

    async getSession(tenantId: string): Promise<WhatsAppSession | null> {
        const normalizedTenantId = this.normalizeTenantId(tenantId);
        const cachedSession = this.sessionsCache.get(normalizedTenantId);

        if (cachedSession) {
            return cachedSession;
        }

        return this.getExistingSession(normalizedTenantId);
    }

    async getSessionStatus(tenantId: string): Promise<WhatsAppSession | null> {
        return this.getSession(tenantId);
    }

    async getQrCode(tenantId: string): Promise<string | null> {
        const session = await this.getSession(tenantId);
        return session?.qr_code ?? null;
    }

    async connectSession(tenantId: string): Promise<WhatsAppSession> {
        const normalizedTenantId = this.normalizeTenantId(tenantId);
        const session = await this.ensureSession(normalizedTenantId);

        await this.updateSession(normalizedTenantId, {
            status: "connecting",
            error_message: null,
        });

        return session;
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

        const session = data as WhatsAppSession;
        this.sessionsCache.set(normalizedTenantId, session);
        return session;
    }

    async getClient(tenantId: string): Promise<WhatsAppClient> {
        const normalizedTenantId = this.normalizeTenantId(tenantId);
        const existingClient = this.clients.get(normalizedTenantId);

        if (existingClient) {
            return existingClient;
        }

        const session = await this.ensureSession(normalizedTenantId);
        const client = await this.initializeClientForTenant(normalizedTenantId, session);

        if (!client) {
            throw new Error(`WhatsApp client for tenant ${normalizedTenantId} was not initialized`);
        }

        return client;
    }
}

export const whatsappSessionManager = new WhatsAppSessionManager();
