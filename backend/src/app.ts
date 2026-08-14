import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import morgan from 'morgan'
import { authRouter } from './modules/auth/router.js'
import { servicesRouter } from './modules/services/router.js'
import { queueRouter } from './modules/queue/router.js'
import { notificationsRouter } from './modules/notifications/router.js'
import { waitTimeRouter } from './modules/wait-time/router.js'
import { historyRouter } from './modules/history/router.js'
import { chatRouter } from './modules/chat/router.js'
import { reportsRouter } from './modules/reports/router.js'

export function createApp() {
    const app = express()
    app.use(cors()) // dev-only wide-open CORS so the Vite dev server (a different origin) can call this API
    app.use(morgan('dev'))
    app.use(express.json())

    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok' })
    })

    app.use('/api/auth', authRouter)
    app.use('/api/services', servicesRouter)
    app.use('/api/queue', queueRouter)
    app.use('/api/notifications', notificationsRouter)
    app.use('/api/wait-time', waitTimeRouter)
    app.use('/api/history', historyRouter)
    app.use('/api/chat', chatRouter)
    app.use('/api/reports', reportsRouter)

    // Final safety net: a route handler throwing or rejecting (e.g. the LLM
    // provider erroring out) must never be allowed to become an unhandled
    // rejection — without this, Express 4 doesn't catch those on its own,
    // and an unhandled rejection crashes the whole process for every user,
    // not just the one request that failed.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        console.error(err)
        res.status(500).json({ error: 'Internal server error' })
    })

    return app
}
