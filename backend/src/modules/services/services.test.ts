import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import * as argon2 from 'argon2'
import { createApp } from '../../app.js'
import { prisma } from '../../database.js'
import type { Service } from '../../generated/prisma/client.js'

// Both arrays are module-level singletons shared by every test in this file
// (and mutated by the endpoints under test), so reset them to their real seed
// state before each test — same pattern as queue.test.ts's resetQueue.
let baseService: Service

beforeAll(async () => {
    const userPasswordHash = await argon2.hash('demo-user')
    const adminPasswordHash = await argon2.hash('demo-admin')
    await prisma.user.upsert({
        where: { email: 'jamie@example.com' },
        update: { passwordHash: userPasswordHash, role: 'user' },
        create: { name: 'Jamie Lee', email: 'jamie@example.com', passwordHash: userPasswordHash, role: 'user' },
    })
    await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: { passwordHash: adminPasswordHash, role: 'admin' },
        create: { name: 'Alex Admin', email: 'admin@example.com', passwordHash: adminPasswordHash, role: 'admin' },
    })
})

beforeEach(async () => {
    await prisma.queueEntry.deleteMany()
    await prisma.service.deleteMany({ where: { name: { startsWith: 'Service Test ' } } })
    baseService = await prisma.service.create({
        data: {
            name: 'Service Test Dinner',
            description: 'Test service',
            expectedDurationMinutes: 45,
            priority: 'high',
            status: 'open',
        },
    })
})

afterAll(async () => {
    await prisma.queueEntry.deleteMany()
    await prisma.service.deleteMany({ where: { name: { startsWith: 'Service Test ' } } })
})

async function loginAs(app: Express, email: string, password: string): Promise<string> {
    const res = await request(app).post('/api/auth/login').send({ email, password })
    return res.body.token
}

const validInput = {
    name: 'Service Test Patio Overflow',
    description: 'Extra patio seating during peak hours.',
    expectedDurationMinutes: 30,
    priority: 'low',
}

describe('services module', () => {
    describe('GET /api/services', () => {
        it('rejects an unauthenticated request', async () => {
            const app = createApp()
            const res = await request(app).get('/api/services')

            expect(res.status).toBe(401)
        })

        it('lists services with per-user queue info for an authenticated request', async () => {
            const app = createApp()
            const token = await loginAs(app, 'jamie@example.com', 'demo-user')
            const res = await request(app).get('/api/services').set('Authorization', `Bearer ${token}`)

            expect(res.status).toBe(200)
            expect(res.body.length).toBeGreaterThan(0)
            const service = res.body.find((s: { id: string }) => s.id === baseService.id)
            expect(service).toMatchObject({ queueLength: 0, userInQueue: false })
        })

        it('reflects the requester\'s own active entry via userInQueue', async () => {
            const app = createApp()
            const token = await loginAs(app, 'jamie@example.com', 'demo-user')
            await request(app)
                .post(`/api/queue/${baseService.id}/join`)
                .set('Authorization', `Bearer ${token}`)
                .send({ partySize: 2 })

            const res = await request(app).get('/api/services').set('Authorization', `Bearer ${token}`)
            const service = res.body.find((s: { id: string }) => s.id === baseService.id)
            expect(service).toMatchObject({ queueLength: 1, userInQueue: true })
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
            expect(res.body.name).toBe('Service Test Patio Overflow')
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
                .put(`/api/services/${baseService.id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ ...validInput, name: 'Service Test Updated Name' })

            expect(res.status).toBe(200)
            expect(res.body.name).toBe('Service Test Updated Name')
        })

        it('rejects a non-admin user', async () => {
            const app = createApp()
            const token = await loginAs(app, 'jamie@example.com', 'demo-user')
            const res = await request(app)
                .put(`/api/services/${baseService.id}`)
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
            const before = baseService.status

            const res = await request(app)
                .patch(`/api/services/${baseService.id}/status`)
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
