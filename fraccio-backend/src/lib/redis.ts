// Shared BullMQ Redis connection (queue + worker). REDIS_PASSWORD is optional
// locally but required by managed Redis (e.g. Railway).
export const redisConnection = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
};
