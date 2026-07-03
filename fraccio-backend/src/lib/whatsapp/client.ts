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

        this.client.on("ready", async () => {
            console.log("WhatsApp client is ready!");
            this.isReady = true;

            //TODO: Update session status on DB
            // const chats = await this.client.getChats();
            // console.log(`Retrieved ${chats.length} chats.`);
            // const groups = chats.filter(chat => chat.isGroup);
            // console.log(`Retrieved ${groups.length} groups.`);
            // groups.forEach(group => {
            //     console.log(`Group: ${group.name} (${group.id._serialized})`);
            // });
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
