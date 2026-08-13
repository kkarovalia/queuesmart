import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { authRouter } from './modules/auth/router.js'
import { servicesRouter } from './modules/services/router.js'
import { queueRouter } from './modules/queue/router.js'
import { notificationsRouter } from './modules/notifications/router.js'
import { waitTimeRouter } from './modules/wait-time/router.js'
import { historyRouter } from './modules/history/router.js'
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
    app.use('/api/reports', reportsRouter)

    return app
}
