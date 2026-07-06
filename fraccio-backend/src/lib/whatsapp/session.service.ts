import type { SupabaseClient } from "@supabase/supabase-js";
import { whatsappSessionManager } from "./session-manager.js";

export class WhatsAppSessionService {
    constructor(private supabaseClient: SupabaseClient) {}

    async connect(tenantId: string) {
        return whatsappSessionManager.connectSession(tenantId);
    }

    async getStatus(tenantId: string) {
        return whatsappSessionManager.getSessionStatus(tenantId);
    }

    async getQr(tenantId: string) {
        return whatsappSessionManager.getQrCode(tenantId);
    }
}
