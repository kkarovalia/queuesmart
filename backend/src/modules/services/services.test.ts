import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createApp } from '../../app.js'
import { services, users } from '../../data/store.js'

// Both arrays are module-level singletons shared by every test in this file
// (and mutated by the endpoints under test), so reset them to their real seed
// state before each test — same pattern as queue.test.ts's resetQueue.
const seedServices = [...services]
const seedUsers = [...users]

beforeEach(() => {
    services.length = 0
    services.push(...seedServices)
    users.length = 0
    users.push(...seedUsers)
})

async function loginAs(app: Express, email: string, password: string): Promise<string> {
    const res = await request(app).post('/api/auth/login').send({ email, password })
    return res.body.token
}

const validInput = {
    name: 'Patio Overflow',
    description: 'Extra patio seating during peak hours.',
    expectedDurationMinutes: 30,
    priority: 'low',
}

describe('services module', () => {
    describe('GET /api/services', () => {
        it('lists services without requiring auth', async () => {
            const app = createApp()
            const res = await request(app).get('/api/services')

            expect(res.status).toBe(200)
            expect(res.body.length).toBeGreaterThan(0)
        })
    })

    describe('POST /api/services', () => {
        it('rejects an unauthenticated request', async () => {
            const app = createApp()
            const res = await request(app).post('/api/services').send(validInput)

            expect(res.status).toBe(401)
        })

        it('rejects a non-admin user', async () => {
            const app = createApp()
            const token = await loginAs(app, 'jamie@example.com', 'demo-user')
            const res = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${token}`)
                .send(validInput)

            expect(res.status).toBe(403)
        })

        it('creates a service for an admin', async () => {
            const app = createApp()
            const token = await loginAs(app, 'admin@example.com', 'demo-admin')
            const res = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${token}`)
                .send(validInput)

            expect(res.status).toBe(201)
            expect(res.body.name).toBe('Patio Overflow')
            expect(res.body.status).toBe('open')
        })

        it('rejects a name over 100 characters', async () => {
            const app = createApp()
            const token = await loginAs(app, 'admin@example.com', 'demo-admin')
            const res = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...validInput, name: 'x'.repeat(101) })

            expect(res.status).toBe(400)
        })

        it('rejects a non-positive expectedDurationMinutes', async () => {
            const app = createApp()
            const token = await loginAs(app, 'admin@example.com', 'demo-admin')
            const res = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...validInput, expectedDurationMinutes: 0 })

            expect(res.status).toBe(400)
        })

        it('rejects an invalid priority', async () => {
            const app = createApp()
            const token = await loginAs(app, 'admin@example.com', 'demo-admin')
            const res = await request(app)
                .post('/api/services')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...validInput, priority: 'urgent' })

            expect(res.status).toBe(400)
        })
    })

    describe('PUT /api/services/:id', () => {
        it('updates an existing service for an admin', async () => {
            const app = createApp()
            const token = await loginAs(app, 'admin@example.com', 'demo-admin')
            const res = await request(app)
                .put('/api/services/svc-1')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...validInput, name: 'Updated Name' })

            expect(res.status).toBe(200)
            expect(res.body.name).toBe('Updated Name')
        })

        it('rejects a non-admin user', async () => {
            const app = createApp()
            const token = await loginAs(app, 'jamie@example.com', 'demo-user')
            const res = await request(app)
                .put('/api/services/svc-1')
                .set('Authorization', `Bearer ${token}`)
                .send(validInput)

            expect(res.status).toBe(403)
        })

        it('returns 404 for a nonexistent service', async () => {
            const app = createApp()
            const token = await loginAs(app, 'admin@example.com', 'demo-admin')
            const res = await request(app)
                .put('/api/services/svc-nope')
                .set('Authorization', `Bearer ${token}`)
                .send(validInput)

            expect(res.status).toBe(404)
        })
    })

    describe('PATCH /api/services/:id/status', () => {
        it('toggles an existing service status for an admin', async () => {
            const app = createApp()
            const token = await loginAs(app, 'admin@example.com', 'demo-admin')
            const before = services.find(item => item.id === 'svc-1')?.status

            const res = await request(app)
                .patch('/api/services/svc-1/status')
                .set('Authorization', `Bearer ${token}`)

            expect(res.status).toBe(200)
            expect(res.body.status).not.toBe(before)
        })

        it('returns 404 for a nonexistent service', async () => {
            const app = createApp()
            const token = await loginAs(app, 'admin@example.com', 'demo-admin')
            const res = await request(app)
                .patch('/api/services/svc-nope/status')
                .set('Authorization', `Bearer ${token}`)

            expect(res.status).toBe(404)
        })
    })
})
