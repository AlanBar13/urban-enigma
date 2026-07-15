import { Queue } from "bullmq"
import { redisConnection } from "../lib/redis.js"

export const whatsappQueue = new Queue("whatsapp", {
    connection: redisConnection,
})
