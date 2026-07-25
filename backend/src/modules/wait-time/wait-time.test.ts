import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { calculateEstimatedWaitMinutes } from './router.js'

describe('wait-time module', () => {
    describe('calculateEstimatedWaitMinutes (core business logic)', () => {
        it('multiplies parties ahead by the expected duration', () => {
            expect(calculateEstimatedWaitMinutes(3, 45)).toBe(135)
        })

        it('returns 0 when nobody is ahead', () => {
            expect(calculateEstimatedWaitMinutes(0, 45)).toBe(0)
        })
    })

    describe('GET /api/wait-time/:serviceId', () => {
        it('returns the aggregate estimate for a known service', async () => {
            const app = createApp()
            const res = await request(app).get('/api/wait-time/svc-1')

            expect(res.status).toBe(200)
            expect(res.body.serviceId).toBe('svc-1')
            expect(res.body.waitingCount).toBe(2)
            expect(res.body.estimatedWaitMinutes).toBe(2 * 45)
        })

        it('returns 404 for an unknown service', async () => {
            const app = createApp()
            const res = await request(app).get('/api/wait-time/does-not-exist')

            expect(res.status).toBe(404)
        })
    })

    describe('GET /api/wait-time/:serviceId/entry/:entryId', () => {
        it('returns position and estimate for a specific queue entry', async () => {
            const app = createApp()
            const res = await request(app).get('/api/wait-time/svc-1/entry/q-2')

            expect(res.status).toBe(200)
            expect(res.body.position).toBe(2)
            expect(res.body.estimatedWaitMinutes).toBe(1 * 45)
        })

        it('returns position 1 and a 0 minute estimate for whoever is at the front', async () => {
            const app = createApp()
            const res = await request(app).get('/api/wait-time/svc-1/entry/q-1')

            expect(res.status).toBe(200)
            expect(res.body.position).toBe(1)
            expect(res.body.estimatedWaitMinutes).toBe(0)
        })

        it('returns 404 for a queue entry id that never existed', async () => {
            const app = createApp()
            const res = await request(app).get('/api/wait-time/svc-1/entry/does-not-exist')

            expect(res.status).toBe(404)
        })

        it('returns 404 for an unknown service', async () => {
            const app = createApp()
            const res = await request(app).get('/api/wait-time/does-not-exist/entry/q-1')

            expect(res.status).toBe(404)
        })

        it('returns 400 for an entry that has already been served', async () => {
            const app = createApp()
            const joinRes = await request(app)
                .post('/api/queue/svc-3/join')
                .send({ userId: 'served-user', partySize: 2 })
            const servedEntryId = joinRes.body.id

            await request(app).post('/api/queue/svc-3/serve-next')

            const res = await request(app).get(`/api/wait-time/svc-3/entry/${servedEntryId}`)
            expect(res.status).toBe(400)
        })

        it('reflects priority ordering, not just arrival order', async () => {
            const app = createApp()

            // svc-4 exists but is closed in the seed data; use svc-3 instead,
            // which starts with an empty queue.
            const firstJoin = await request(app)
                .post('/api/queue/svc-3/join')
                .send({ userId: 'low-priority-first', partySize: 2, priority: 'low' })
            const secondJoin = await request(app)
                .post('/api/queue/svc-3/join')
                .send({ userId: 'high-priority-second', partySize: 1, priority: 'high' })

            // Arrived second, but higher priority, so it should be ahead
            // despite joining later - this is exactly the case that plain
            // arrival-order sorting would get wrong.
            const highPriorityWait = await request(app).get(`/api/wait-time/svc-3/entry/${secondJoin.body.id}`)
            expect(highPriorityWait.body.position).toBe(1)

            const lowPriorityWait = await request(app).get(`/api/wait-time/svc-3/entry/${firstJoin.body.id}`)
            expect(lowPriorityWait.body.position).toBe(2)
        })
    })
})
