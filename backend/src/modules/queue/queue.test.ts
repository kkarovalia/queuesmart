import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { prisma } from '../../database.js'
import type { QueueEntry, Service, User } from '../../generated/prisma/client.js'
import { signToken } from '../../middleware/auth.js'
import { getCurrentQueue, resolveEntryPriority, sortQueueEntries, syncAlmostReady } from './router.js'

let user: User
let secondUser: User
let admin: User
let openService: Service
let closedService: Service
let userAuth: string
let secondUserAuth: string
let adminAuth: string

const app = createApp()

function authHeader(subject: User): string {
    return `Bearer ${signToken({ sub: subject.id, role: subject.role })}`
}

function fakeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
    return {
        id: '507f1f77bcf86cd799439011',
        serviceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        partySize: 2,
        priority: null,
        status: 'waiting',
        outcome: null,
        waitMinutes: null,
        joinedAt: new Date('2026-07-10T18:00:00Z'),
        resolvedAt: null,
        ...overrides,
    }
}

async function createEntry(overrides: Partial<QueueEntry> = {}): Promise<QueueEntry> {
    return prisma.queueEntry.create({
        data: {
            serviceId: overrides.serviceId ?? openService.id,
            userId: overrides.userId ?? user.id,
            partySize: overrides.partySize ?? 2,
            priority: overrides.priority,
            status: overrides.status ?? 'waiting',
            joinedAt: overrides.joinedAt,
            resolvedAt: overrides.resolvedAt,
            outcome: overrides.outcome,
            waitMinutes: overrides.waitMinutes,
        },
    })
}

beforeAll(async () => {
    await prisma.queueEntry.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.user.deleteMany({ where: { email: { startsWith: 'queue-test-' } } })
    await prisma.service.deleteMany({ where: { name: { startsWith: 'Queue Test ' } } })

    user = await prisma.user.create({
        data: { email: 'queue-test-user@example.com', passwordHash: 'not-used', role: 'user' },
    })
    secondUser = await prisma.user.create({
        data: { email: 'queue-test-second@example.com', passwordHash: 'not-used', role: 'user' },
    })
    admin = await prisma.user.create({
        data: { email: 'queue-test-admin@example.com', passwordHash: 'not-used', role: 'admin' },
    })
    openService = await prisma.service.create({
        data: {
            name: 'Queue Test Dinner',
            description: 'Queue integration test service',
            expectedDurationMinutes: 45,
            priority: 'medium',
            status: 'open',
        },
    })
    closedService = await prisma.service.create({
        data: {
            name: 'Queue Test Closed',
            description: 'Closed queue integration test service',
            expectedDurationMinutes: 30,
            priority: 'low',
            status: 'closed',
        },
    })
    userAuth = authHeader(user)
    secondUserAuth = authHeader(secondUser)
    adminAuth = authHeader(admin)
})

beforeEach(async () => {
    await prisma.queueEntry.deleteMany()
    // A4: notifications are real Prisma records now, not the old in-memory
    // array — clear them per-test too, or a notification from one test would
    // still be sitting there for the next test's own assertions to trip over.
    await prisma.notification.deleteMany({ where: { userId: { in: [user.id, secondUser.id, admin.id] } } })
})

afterAll(async () => {
    await prisma.queueEntry.deleteMany()
    // Notifications reference User (required relation) — must go before the
    // users themselves, or Prisma's relation-mode check rejects the delete.
    await prisma.notification.deleteMany({ where: { userId: { in: [user.id, secondUser.id, admin.id] } } })
    await prisma.service.deleteMany({ where: { name: { startsWith: 'Queue Test ' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'queue-test-' } } })
})

describe('queue ordering helpers', () => {
    it('orders by priority and then arrival time without mutating the input', () => {
        const entries = [
            fakeEntry({ id: 'low', priority: 'low', joinedAt: new Date('2026-07-10T17:00:00Z') }),
            fakeEntry({ id: 'high-late', priority: 'high', joinedAt: new Date('2026-07-10T19:00:00Z') }),
            fakeEntry({ id: 'high-early', priority: 'high', joinedAt: new Date('2026-07-10T18:00:00Z') }),
        ]

        expect(sortQueueEntries(entries, openService).map(entry => entry.id)).toEqual(['high-early', 'high-late', 'low'])
        expect(entries.map(entry => entry.id)).toEqual(['low', 'high-late', 'high-early'])
    })

    it('inherits service priority when an entry has no override', () => {
        expect(resolveEntryPriority(fakeEntry(), openService)).toBe(openService.priority)
        expect(resolveEntryPriority(fakeEntry({ priority: 'high' }), openService)).toBe('high')
    })

    it('persists the almost-ready flag on only the first active entry', async () => {
        const first = await createEntry({ joinedAt: new Date('2026-07-10T18:00:00Z') })
        await createEntry({ userId: secondUser.id, joinedAt: new Date('2026-07-10T18:05:00Z') })

        const promoted = await syncAlmostReady(openService)
        const active = await getCurrentQueue(openService)

        expect(promoted?.id).toBe(first.id)
        expect(active.map(entry => entry.status)).toEqual(['almost_ready', 'waiting'])
        expect(await syncAlmostReady(openService)).toBeNull()
    })
})

describe('queue authorization', () => {
    it('requires authentication to join or leave', async () => {
        expect((await request(app).post(`/api/queue/${openService.id}/join`).send({ partySize: 2 })).status).toBe(401)
        expect((await request(app).post(`/api/queue/${openService.id}/leave`)).status).toBe(401)
    })

    it('restricts queue listing and serving to administrators', async () => {
        const list = await request(app).get(`/api/queue/${openService.id}`).set('Authorization', userAuth)
        const serve = await request(app).post(`/api/queue/${openService.id}/serve-next`).set('Authorization', userAuth)

        expect(list.status).toBe(403)
        expect(serve.status).toBe(403)
    })

    it('rejects a token for a user that no longer exists', async () => {
        const staleAuth = `Bearer ${signToken({ sub: '507f1f77bcf86cd799439099', role: 'user' })}`
        const res = await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', staleAuth)
            .send({ partySize: 2 })

        expect(res.status).toBe(404)
        expect(res.body.error).toBe('User not found')
    })
})

describe('POST /api/queue/:serviceId/join', () => {
    it('persists the authenticated user and returns the existing API shape', async () => {
        const res = await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ userId: secondUser.id, partySize: 4 })

        const persisted = await prisma.queueEntry.findUnique({ where: { id: res.body.id } })
        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({
            serviceId: openService.id,
            userId: user.id,
            partySize: 4,
            status: 'almost-ready',
            position: 1,
            servedAt: null,
        })
        expect(persisted?.userId).toBe(user.id)
        expect(persisted?.status).toBe('almost_ready')
    })

    it('is retrievable through a separate app request', async () => {
        await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 2 })

        const res = await request(createApp())
            .get(`/api/queue/${openService.id}`)
            .set('Authorization', adminAuth)

        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].userId).toBe(user.id)
    })

    it('orders persisted entries by priority and reports positions', async () => {
        await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 2, priority: 'low' })
        const high = await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', secondUserAuth)
            .send({ partySize: 2, priority: 'high' })

        const list = await request(app).get(`/api/queue/${openService.id}`).set('Authorization', adminAuth)
        expect(high.body.position).toBe(1)
        expect(list.body.map((entry: { userId: string }) => entry.userId)).toEqual([secondUser.id, user.id])
        expect(list.body.map((entry: { position: number }) => entry.position)).toEqual([1, 2])
    })

    it('rejects invalid party size and priority together', async () => {
        const res = await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 2.5, priority: 'urgent' })

        expect(res.status).toBe(400)
        expect(res.body.details).toEqual([
            'partySize must be a whole number',
            'priority must be one of low, medium, high',
        ])
        expect(await prisma.queueEntry.count()).toBe(0)
    })

    it('enforces the party size range', async () => {
        const tooSmall = await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 0 })
        const tooLarge = await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 21 })

        expect(tooSmall.body.details).toContain('partySize must be between 1 and 20')
        expect(tooLarge.body.details).toContain('partySize must be between 1 and 20')
    })

    it('rejects closed and nonexistent services', async () => {
        const closed = await request(app)
            .post(`/api/queue/${closedService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 2 })
        const missing = await request(app)
            .post('/api/queue/507f1f77bcf86cd799439099/join')
            .set('Authorization', userAuth)
            .send({ partySize: 2 })

        expect(closed.status).toBe(400)
        expect(missing.status).toBe(404)
    })

    it('prevents a duplicate active entry but allows rejoining after leaving', async () => {
        await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 2 })
        const duplicate = await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 2 })

        await request(app).post(`/api/queue/${openService.id}/leave`).set('Authorization', userAuth)
        const rejoin = await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 3 })

        expect(duplicate.status).toBe(409)
        expect(rejoin.status).toBe(201)
    })

    it('keeps the existing notification integration boundary', async () => {
        await request(app)
            .post(`/api/queue/${openService.id}/join`)
            .set('Authorization', userAuth)
            .send({ partySize: 2 })

        const created = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'asc' },
        })
        expect(created.map(note => note.kind)).toEqual(['queue_joined', 'almost_ready'])
    })
})

describe('leaving and serving persisted entries', () => {
    it('allows a user to leave only their own active entry', async () => {
        await createEntry()

        const wrongUser = await request(app)
            .post(`/api/queue/${openService.id}/leave`)
            .set('Authorization', secondUserAuth)
        const left = await request(app)
            .post(`/api/queue/${openService.id}/leave`)
            .set('Authorization', userAuth)

        expect(wrongUser.status).toBe(404)
        expect(left.status).toBe(200)
        expect(left.body.status).toBe('left')
        expect(left.body.servedAt).not.toBeNull()
        expect((await prisma.queueEntry.findUnique({ where: { id: left.body.id } }))?.outcome).toBe('cancelled')
    })

    it('serves the first party, records history fields, and promotes the next', async () => {
        const first = await createEntry({ joinedAt: new Date(Date.now() - 5 * 60_000) })
        const second = await createEntry({ userId: secondUser.id, joinedAt: new Date() })
        await syncAlmostReady(openService)

        const res = await request(app)
            .post(`/api/queue/${openService.id}/serve-next`)
            .set('Authorization', adminAuth)

        const served = await prisma.queueEntry.findUnique({ where: { id: first.id } })
        const promoted = await prisma.queueEntry.findUnique({ where: { id: second.id } })
        expect(res.status).toBe(200)
        expect(res.body.served).toMatchObject({ id: first.id, status: 'served' })
        expect(res.body.nowAlmostReady).toMatchObject({ id: second.id, status: 'almost-ready' })
        expect(served).toMatchObject({ status: 'served', outcome: 'seated' })
        expect(served?.resolvedAt).toBeInstanceOf(Date)
        expect(served?.waitMinutes).toBeGreaterThanOrEqual(5)
        expect(promoted?.status).toBe('almost_ready')
    })

    it('returns 404 when the service or active queue is missing', async () => {
        const empty = await request(app)
            .post(`/api/queue/${openService.id}/serve-next`)
            .set('Authorization', adminAuth)
        const missing = await request(app)
            .get('/api/queue/507f1f77bcf86cd799439099')
            .set('Authorization', adminAuth)

        expect(empty.status).toBe(404)
        expect(missing.status).toBe(404)
    })
})
