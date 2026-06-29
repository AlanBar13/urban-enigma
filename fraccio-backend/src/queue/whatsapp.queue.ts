import { Queue } from "bullmq"

export const whatsappQueue = new Queue("whatsapp", {
    connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
    }
})