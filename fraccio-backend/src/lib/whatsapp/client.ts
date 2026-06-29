import { Client } from "whatsapp-web.js"
import whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
const { LocalAuth } = whatsapp;

export class WhatsAppClient {
    private client: Client;
    private isReady: boolean = false;

    constructor(clientId: string) {
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
        this.client.on("qr", (qr) => {
            console.log("QR RECEIVED, Scan the QR code with your WhatsApp app:", qr);
            qrcode.generate(qr, { small: true });

            //TODO:Save the QR code to a db
        });

        this.client.on("ready", () => {
            console.log("WhatsApp client is ready!");
            this.isReady = true;
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
