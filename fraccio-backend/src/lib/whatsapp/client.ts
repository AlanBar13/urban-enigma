import { Client } from "whatsapp-web.js"
import whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
const { LocalAuth } = whatsapp;

export interface WhatsAppClientEvents {
    onQr?: (qr: string) => Promise<void> | void;
    onReady?: () => Promise<void> | void;
    onError?: (message: string) => Promise<void> | void;
}

export class WhatsAppClient {
    private client: Client;
    private isReady: boolean = false;

    constructor(clientId: string, private events: WhatsAppClientEvents = {}) {
        this.client = new Client({
            authStrategy: new LocalAuth({ clientId }),
            puppeteer: {
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"]
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
                await this.events.onReady();
            }
        });

        this.client.on("auth_failure", async (message) => {
            if (this.events.onError) {
                await this.events.onError(message || "Authentication failed");
            }
        });
    }

    async initialize() {
        await this.client.initialize();
    }

    getClient(): Client {
        return this.client;
    }

    ready(): boolean {
        return this.isReady;
    }
}
