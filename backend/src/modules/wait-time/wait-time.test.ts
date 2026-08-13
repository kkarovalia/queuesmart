import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { prisma } from '../../database.js'
import type { Service, User } from '../../generated/prisma/client.js'
import { signToken } from '../../middleware/auth.js'
import { calculateEstimatedWaitMinutes } from './router.js'

let service: Service
let user: User
let otherUser: User
let userAuth: string

beforeAll(async () => {
    await prisma.queueEntry.deleteMany()
    await prisma.user.deleteMany({ where: { email: { startsWith: 'wait-test-' } } })
    await prisma.service.deleteMany({ where: { name: 'Wait Test Dinner' } })
    user = await prisma.user.create({
        data: { name: 'Wait Test User', email: 'wait-test-user@example.com', passwordHash: 'not-used', role: 'user' },
    })
    otherUser = await prisma.user.create({
        data: { name: 'Wait Test Other User', email: 'wait-test-other@example.com', passwordHash: 'not-used', role: 'user' },
    })
    service = await prisma.service.create({
        data: {
            name: 'Wait Test Dinner',
            description: 'Wait time integration tests',
            expectedDurationMinutes: 45,
            priority: 'medium',
            status: 'open',
        },
    })
    userAuth = `Bearer ${signToken({ sub: user.id, role: user.role })}`
})

beforeEach(async () => {
    await prisma.queueEntry.deleteMany()
})

afterAll(async () => {
    await prisma.queueEntry.deleteMany()
    await prisma.service.deleteMany({ where: { name: 'Wait Test Dinner' } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'wait-test-' } } })
})

describe('wait-time module', () => {
    it('calculates estimates from parties ahead', () => {
        expect(calculateEstimatedWaitMinutes(3, 45)).toBe(135)
        expect(calculateEstimatedWaitMinutes(0, 45)).toBe(0)
    })

    it('returns the aggregate estimate from persisted active entries', async () => {
        await prisma.queueEntry.createMany({
            data: [
                { serviceId: service.id, userId: user.id, partySize: 2, status: 'almost_ready', position: 1 },
                { serviceId: service.id, userId: otherUser.id, partySize: 2, status: 'waiting', position: 2 },
            ],
        })

        const res = await request(createApp()).get(`/api/wait-time/${service.id}`)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ waitingCount: 2, estimatedWaitMinutes: 90 })
    })

    it('returns the authenticated owner position using priority order', async () => {
        await prisma.queueEntry.create({
            data: { serviceId: service.id, userId: otherUser.id, partySize: 2, priority: 'low', status: 'waiting', position: 1 },
        })
        const entry = await prisma.queueEntry.create({
            data: { serviceId: service.id, userId: user.id, partySize: 2, priority: 'high', status: 'waiting', position: 2 },
        })

        const res = await request(createApp())
            .get(`/api/wait-time/${service.id}/entry/${entry.id}`)
            .set('Authorization', userAuth)

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ position: 1, estimatedWaitMinutes: 0 })
    })

    it('does not reveal another user queue entry', async () => {
        const entry = await prisma.queueEntry.create({
            data: { serviceId: service.id, userId: otherUser.id, partySize: 2, status: 'waiting', position: 1 },
        })

        const res = await request(createApp())
            .get(`/api/wait-time/${service.id}/entry/${entry.id}`)
            .set('Authorization', userAuth)

        expect(res.status).toBe(404)
    })

    it('returns 400 after the owner entry is resolved', async () => {
        const entry = await prisma.queueEntry.create({
            data: { serviceId: service.id, userId: user.id, partySize: 2, status: 'served', resolvedAt: new Date(), position: 1 },
        })

        const res = await request(createApp())
            .get(`/api/wait-time/${service.id}/entry/${entry.id}`)
            .set('Authorization', userAuth)

        expect(res.status).toBe(400)
    })

    it('requires auth for an entry and returns 404 for an unknown service', async () => {
        const unauthenticated = await request(createApp()).get(`/api/wait-time/${service.id}/entry/507f1f77bcf86cd799439099`)
        const missingService = await request(createApp()).get('/api/wait-time/507f1f77bcf86cd799439099')

        expect(unauthenticated.status).toBe(401)
        expect(missingService.status).toBe(404)
    })
})
