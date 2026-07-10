import { Client } from "whatsapp-web.js"
import whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { rm } from "node:fs/promises";
import path from "node:path";
const { LocalAuth } = whatsapp;

export interface WhatsAppClientEvents {
    onQr?: (qr: string) => Promise<void> | void;
    onReady?: (phone: string) => Promise<void> | void;
    onError?: (message: string) => Promise<void> | void;
    onDisconnected?: (reason: string) => Promise<void> | void;
}

export class WhatsAppClient {
    private client: Client;
    private isReady: boolean = false;

    constructor(private clientId: string, private events: WhatsAppClientEvents = {}) {
        this.client = new Client({
            authStrategy: new LocalAuth({ clientId }),
            puppeteer: {
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            }
        })

        this.registerEvents();
    }

    private registerEvents() {
        this.client.on("qr", async (qr) => {
            console.log("QR RECEIVED, Scan the QR code with your WhatsApp app:", qr);
            qrcode.generate(qr, { small: true });

            if (this.events.onQr) {
                await this.events.onQr(qr);
            }
        });

        this.client.on("ready", async () => {
            console.log("WhatsApp client is ready!");
            this.isReady = true;

            if (this.events.onReady) {
                await this.events.onReady(this.client.info?.wid?.user ?? "");
            }
        });

        this.client.on("auth_failure", async (message) => {
            if (this.events.onError) {
                await this.events.onError(message || "Authentication failed");
            }
        });

        this.client.on("disconnected", async (reason) => {
            console.log(`WhatsApp client ${this.clientId} disconnected:`, reason);
            this.isReady = false;

            if (this.events.onDisconnected) {
                await this.events.onDisconnected(String(reason));
            }
        });
    }

    async initialize() {
        // A crashed session leaves a stale Chromium SingletonLock in the LocalAuth
        // profile that blocks relaunch ("profile appears to be in use"). Safe to clear
        // here: the worker is concurrency:1, so only one Chromium per client runs.
        // ponytail: lock cleanup, not a real cross-process guard — fine while single-worker.
        const profileDir = path.join(path.resolve("./.wwebjs_auth/"), `session-${this.clientId}`);
        await rm(path.join(profileDir, "SingletonLock"), { force: true });
        await this.client.initialize();
    }

    /**
     * Resolves once the client has emitted `ready` (immediately if it already has).
     * `client.initialize()` resolves before the session is usable, so callers that
     * are about to perform WhatsApp operations must await this first.
     */
    async waitUntilReady(timeoutMs = 60_000): Promise<void> {
        if (this.isReady) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timer);
                this.client.off("ready", onReady);
                this.client.off("auth_failure", onAuthFailure);
            };
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`WhatsApp client ${this.clientId} was not ready after ${timeoutMs}ms`));
            }, timeoutMs);
            const onReady = () => {
                cleanup();
                resolve();
            };
            const onAuthFailure = (message: string) => {
                cleanup();
                reject(new Error(message || "Authentication failed"));
            };
            this.client.on("ready", onReady);
            this.client.on("auth_failure", onAuthFailure);
        });
    }

    async logout() {
        await this.client.logout();
    }

    async destroy() {
        this.isReady = false;
        await this.client.destroy();
    }

    getClient(): Client {
        return this.client;
    }

    ready(): boolean {
        return this.isReady;
    }
}
