import "dotenv/config"
import { startWhatsAppWorker } from "./workers/whatsapp.worker.js"


startWhatsAppWorker().catch((err) => {
    console.error("Error starting WhatsApp worker:", err);
    process.exit(1);
})