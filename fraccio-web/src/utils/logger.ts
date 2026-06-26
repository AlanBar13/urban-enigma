import { createIsomorphicFn } from '@tanstack/react-start'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const logger = createIsomorphicFn()
    .server((level: LogLevel, message: string, data?: any) => {
        const timestamp = new Date().toISOString()
        if (process.env.NODE_ENV === 'development') {
            console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, data || '')
        }
        else {
            console.log(JSON.stringify({
                timestamp,
                level,
                message,
                data,
                service: 'fraccio-backend',
                env: process.env.NODE_ENV
            }))
        }
    })
    .client((level: LogLevel, message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console[level](`[CLIENT] [${level.toUpperCase()}]`, message, data)
        } else {
            // Production: Send to analytics service
            // analytics.track('client_log', { level, message, data })
        }
    });

export { logger }