import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { notifications, queueEntries, services } from '../../data/store.js'
import type { QueueEntry, Service } from '../../types.js'
import { getCurrentQueue, resolveEntryPriority, sortQueueEntries, syncAlmostReady } from './router.js'

// svc-1 "Dinner Waitlist" is open with priority 'high'; svc-4 "Private Dining"
// is the closed one. Both come from the shared seed data in data/store.ts.
const OPEN_SERVICE = 'svc-1'
const CLOSED_SERVICE = 'svc-4'

function serviceById(id: string): Service {
    const service = services.find(item => item.id === id)
    if (!service) {
        throw new Error(`test setup expected service ${id} in the seed data`)
    }
    return service
}

function entry(overrides: Partial<QueueEntry> & Pick<QueueEntry, 'id' | 'userId' | 'joinedAt'>): QueueEntry {
    return {
        serviceId: OPEN_SERVICE,
        partySize: 2,
        status: 'waiting',
        servedAt: null,
        ...overrides,
    }
}

// The in-memory store is a module-level singleton shared by every test in this
// file, and these tests mutate it. Reset it to a known line-up before each one
// so they can't leak into each other or depend on execution order.
function resetQueue(entries: QueueEntry[] = []) {
    queueEntries.length = 0
    queueEntries.push(...entries)
}

beforeEach(() => {
    resetQueue()
    notifications.length = 0
})

describe('queue ordering', () => {
    it('orders by arrival time when every party has the same priority', () => {
        const service = serviceById(OPEN_SERVICE)
        const entries = [
            entry({ id: 'q-late', userId: 'u-late', joinedAt: '2026-07-10T18:30:00Z' }),
            entry({ id: 'q-early', userId: 'u-early', joinedAt: '2026-07-10T18:00:00Z' }),
            entry({ id: 'q-middle', userId: 'u-middle', joinedAt: '2026-07-10T18:15:00Z' }),
        ]

        const sorted = sortQueueEntries(entries, service)

        expect(sorted.map(item => item.id)).toEqual(['q-early', 'q-middle', 'q-late'])
    })

    it('puts a higher-priority party ahead of one that arrived earlier', () => {
        const service = serviceById(OPEN_SERVICE)
        const entries = [
            entry({ id: 'q-low', userId: 'u-low', joinedAt: '2026-07-10T18:00:00Z', priority: 'low' }),
            entry({ id: 'q-high', userId: 'u-high', joinedAt: '2026-07-10T19:00:00Z', priority: 'high' }),
            entry({ id: 'q-medium', userId: 'u-medium', joinedAt: '2026-07-10T18:30:00Z', priority: 'medium' }),
        ]

        const sorted = sortQueueEntries(entries, service)

        expect(sorted.map(item => item.id)).toEqual(['q-high', 'q-medium', 'q-low'])
    })

    it('falls back to arrival order within the same priority band', () => {
        const service = serviceById(OPEN_SERVICE)
        const entries = [
            entry({ id: 'q-high-late', userId: 'u-a', joinedAt: '2026-07-10T19:00:00Z', priority: 'high' }),
            entry({ id: 'q-high-early', userId: 'u-b', joinedAt: '2026-07-10T18:00:00Z', priority: 'high' }),
            entry({ id: 'q-low-early', userId: 'u-c', joinedAt: '2026-07-10T17:00:00Z', priority: 'low' }),
        ]

        const sorted = sortQueueEntries(entries, service)

        expect(sorted.map(item => item.id)).toEqual(['q-high-early', 'q-high-late', 'q-low-early'])
    })

    it('does not modify the array it was given', () => {
        const service = serviceById(OPEN_SERVICE)
        const entries = [
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T19:00:00Z' }),
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' }),
        ]

        sortQueueEntries(entries, service)

        expect(entries.map(item => item.id)).toEqual(['q-2', 'q-1'])
    })
})

describe('resolveEntryPriority', () => {
    it('uses the party\'s own priority when it has one', () => {
        const service = serviceById(OPEN_SERVICE)
        const party = entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', priority: 'low' })

        expect(resolveEntryPriority(party, service)).toBe('low')
    })

    it('inherits the service\'s priority when the party has none', () => {
        const service = serviceById(OPEN_SERVICE)
        const party = entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' })

        expect(service.priority).toBe('high')
        expect(resolveEntryPriority(party, service)).toBe('high')
    })
})

describe('getCurrentQueue', () => {
    it('leaves out parties that have already been served or left', () => {
        const service = serviceById(OPEN_SERVICE)
        resetQueue([
            entry({ id: 'q-served', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', status: 'served' }),
            entry({ id: 'q-left', userId: 'u-2', joinedAt: '2026-07-10T18:05:00Z', status: 'left' }),
            entry({ id: 'q-waiting', userId: 'u-3', joinedAt: '2026-07-10T18:10:00Z' }),
        ])

        expect(getCurrentQueue(service).map(item => item.id)).toEqual(['q-waiting'])
    })

    it('keeps an almost-ready party in the line', () => {
        const service = serviceById(OPEN_SERVICE)
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', status: 'almost-ready' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z' }),
        ])

        expect(getCurrentQueue(service).map(item => item.id)).toEqual(['q-1', 'q-2'])
    })

    it('only returns parties queued for the requested service', () => {
        const service = serviceById(OPEN_SERVICE)
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' }),
            entry({ id: 'q-other', userId: 'u-2', joinedAt: '2026-07-10T18:05:00Z', serviceId: 'svc-2' }),
        ])

        expect(getCurrentQueue(service).map(item => item.id)).toEqual(['q-1'])
    })
})

describe('syncAlmostReady', () => {
    it('flags whoever is at the front of the line', () => {
        const service = serviceById(OPEN_SERVICE)
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z' }),
        ])

        const promoted = syncAlmostReady(service)

        expect(promoted?.id).toBe('q-1')
        expect(queueEntries.find(item => item.id === 'q-1')?.status).toBe('almost-ready')
        expect(queueEntries.find(item => item.id === 'q-2')?.status).toBe('waiting')
    })

    it('returns null when the front of the line has not changed', () => {
        const service = serviceById(OPEN_SERVICE)
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', status: 'almost-ready' })])

        expect(syncAlmostReady(service)).toBeNull()
    })

    it('moves the flag when a higher-priority party jumps the line', () => {
        const service = serviceById(OPEN_SERVICE)
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', priority: 'low', status: 'almost-ready' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z', priority: 'high' }),
        ])

        const promoted = syncAlmostReady(service)

        expect(promoted?.id).toBe('q-2')
        expect(queueEntries.find(item => item.id === 'q-2')?.status).toBe('almost-ready')
        // The party that got jumped goes back to plain waiting.
        expect(queueEntries.find(item => item.id === 'q-1')?.status).toBe('waiting')
    })

    it('returns null for an empty queue', () => {
        expect(syncAlmostReady(serviceById(OPEN_SERVICE))).toBeNull()
    })
})

describe('GET /api/queue/:serviceId', () => {
    it('returns the current queue in serving order with 1-based positions', async () => {
        resetQueue([
            entry({ id: 'q-low', userId: 'u-low', joinedAt: '2026-07-10T18:00:00Z', priority: 'low' }),
            entry({ id: 'q-high', userId: 'u-high', joinedAt: '2026-07-10T18:30:00Z', priority: 'high' }),
        ])

        const res = await request(createApp()).get(`/api/queue/${OPEN_SERVICE}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(2)
        expect(res.body[0]).toMatchObject({ id: 'q-high', position: 1, priority: 'high' })
        expect(res.body[1]).toMatchObject({ id: 'q-low', position: 2, priority: 'low' })
    })

    it('spells out the inherited priority for a party that did not set one', async () => {
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' })])

        const res = await request(createApp()).get(`/api/queue/${OPEN_SERVICE}`)

        expect(res.status).toBe(200)
        expect(res.body[0].priority).toBe('high')
    })

    it('returns an empty array when nobody is waiting', async () => {
        const res = await request(createApp()).get(`/api/queue/${OPEN_SERVICE}`)

        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it('returns 404 for a service that does not exist', async () => {
        const res = await request(createApp()).get('/api/queue/svc-nope')

        expect(res.status).toBe(404)
        expect(res.body.error).toBe('Service not found')
    })
})

describe('POST /api/queue/:serviceId/join', () => {
    it('adds a party to the queue and reports its position', async () => {
        const res = await request(createApp())
            .post(`/api/queue/${OPEN_SERVICE}/join`)
            .send({ userId: 'u-1', partySize: 4 })

        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({ userId: 'u-1', partySize: 4, serviceId: OPEN_SERVICE, position: 1 })
        expect(queueEntries).toHaveLength(1)
    })

    it('marks the first party to join an empty line as almost-ready', async () => {
        await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-1', partySize: 2 })

        expect(queueEntries[0].status).toBe('almost-ready')
    })

    it('notifies the joining user, and notifies them again as almost-ready since the line was empty', async () => {
        await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-1', partySize: 2 })

        expect(notifications).toHaveLength(2)
        expect(notifications[0]).toMatchObject({ userId: 'u-1', kind: 'queue-joined' })
        expect(notifications[1]).toMatchObject({ userId: 'u-1', kind: 'almost-ready' })
    })

    it('does not send an almost-ready notification when joining behind someone already in line', async () => {
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', status: 'almost-ready' })])

        await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-2', partySize: 2 })

        expect(notifications).toHaveLength(1)
        expect(notifications[0]).toMatchObject({ userId: 'u-2', kind: 'queue-joined' })
    })

    it('puts a high-priority party ahead of parties already in line', async () => {
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', priority: 'low' })])

        const res = await request(createApp())
            .post(`/api/queue/${OPEN_SERVICE}/join`)
            .send({ userId: 'u-2', partySize: 2, priority: 'high' })

        expect(res.status).toBe(201)
        expect(res.body.position).toBe(1)
    })

    it('gives each new party a unique id', async () => {
        const app = createApp()
        await request(app).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-1', partySize: 2 })
        await request(app).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-2', partySize: 2 })

        const ids = queueEntries.map(item => item.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('still generates a usable id when an existing entry is not shaped q-<number>', async () => {
        resetQueue([entry({ id: 'walk-in-abc', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' })])

        const res = await request(createApp())
            .post(`/api/queue/${OPEN_SERVICE}/join`)
            .send({ userId: 'u-2', partySize: 2 })

        expect(res.status).toBe(201)
        expect(res.body.id).toBe('q-1')
    })

    it('returns 404 for a service that does not exist', async () => {
        const res = await request(createApp()).post('/api/queue/svc-nope/join').send({ userId: 'u-1', partySize: 2 })

        expect(res.status).toBe(404)
        expect(res.body.error).toBe('Service not found')
    })

    it('refuses to queue for a closed service', async () => {
        const res = await request(createApp())
            .post(`/api/queue/${CLOSED_SERVICE}/join`)
            .send({ userId: 'u-1', partySize: 2 })

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('This service is not currently open')
        expect(queueEntries).toHaveLength(0)
    })

    it('refuses a second entry for a user already in the same line', async () => {
        const app = createApp()
        await request(app).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-1', partySize: 2 })

        const res = await request(app).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-1', partySize: 2 })

        expect(res.status).toBe(409)
        expect(queueEntries).toHaveLength(1)
    })

    it('lets a user who left rejoin the same line', async () => {
        const app = createApp()
        await request(app).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-1', partySize: 2 })
        await request(app).post(`/api/queue/${OPEN_SERVICE}/leave`).send({ userId: 'u-1' })

        const res = await request(app).post(`/api/queue/${OPEN_SERVICE}/join`).send({ userId: 'u-1', partySize: 2 })

        expect(res.status).toBe(201)
    })
})

describe('POST /api/queue/:serviceId/join validation', () => {
    async function join(body: unknown) {
        return request(createApp()).post(`/api/queue/${OPEN_SERVICE}/join`).send(body as object)
    }

    it('rejects a missing userId', async () => {
        const res = await join({ partySize: 2 })

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('Validation failed')
        expect(res.body.details).toContain('userId is required')
    })

    it('rejects a blank userId', async () => {
        const res = await join({ userId: '   ', partySize: 2 })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('userId is required')
    })

    it('rejects a userId over the length limit', async () => {
        const res = await join({ userId: 'u'.repeat(65), partySize: 2 })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('userId must be 64 characters or fewer')
    })

    it('rejects a userId that is not a string', async () => {
        const res = await join({ userId: 42, partySize: 2 })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('userId is required')
    })

    it('rejects a missing partySize', async () => {
        const res = await join({ userId: 'u-1' })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('partySize must be a whole number')
    })

    it('rejects a partySize that is not a number', async () => {
        const res = await join({ userId: 'u-1', partySize: '4' })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('partySize must be a whole number')
    })

    it('rejects a fractional partySize', async () => {
        const res = await join({ userId: 'u-1', partySize: 2.5 })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('partySize must be a whole number')
    })

    it('rejects a partySize below 1', async () => {
        const res = await join({ userId: 'u-1', partySize: 0 })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('partySize must be between 1 and 20')
    })

    it('rejects a partySize above the limit', async () => {
        const res = await join({ userId: 'u-1', partySize: 21 })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('partySize must be between 1 and 20')
    })

    it('rejects a priority outside the allowed set', async () => {
        const res = await join({ userId: 'u-1', partySize: 2, priority: 'urgent' })

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('priority must be one of low, medium, high')
    })

    it('reports every problem at once rather than stopping at the first', async () => {
        const res = await join({ partySize: 99, priority: 'urgent' })

        expect(res.status).toBe(400)
        expect(res.body.details).toHaveLength(3)
    })

    it('adds nobody to the queue when validation fails', async () => {
        await join({ partySize: -1 })

        expect(queueEntries).toHaveLength(0)
    })
})

describe('POST /api/queue/:serviceId/leave', () => {
    it('marks the party as having left', async () => {
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' })])

        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/leave`).send({ userId: 'u-1' })

        expect(res.status).toBe(200)
        expect(res.body.status).toBe('left')
        expect(queueEntries[0].status).toBe('left')
    })

    it('promotes the next party to almost-ready', async () => {
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', status: 'almost-ready' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z' }),
        ])

        await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/leave`).send({ userId: 'u-1' })

        expect(queueEntries.find(item => item.id === 'q-2')?.status).toBe('almost-ready')
    })

    it('lets an almost-ready party change its mind and leave', async () => {
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', status: 'almost-ready' })])

        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/leave`).send({ userId: 'u-1' })

        expect(res.status).toBe(200)
        expect(res.body.status).toBe('left')
    })

    it('returns 404 when the user is not in this line', async () => {
        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/leave`).send({ userId: 'u-nobody' })

        expect(res.status).toBe(404)
        expect(res.body.error).toBe('Active queue entry not found')
    })

    it('returns 404 rather than re-leaving a party that already left', async () => {
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', status: 'left' })])

        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/leave`).send({ userId: 'u-1' })

        expect(res.status).toBe(404)
    })

    it('returns 404 for a service that does not exist', async () => {
        const res = await request(createApp()).post('/api/queue/svc-nope/leave').send({ userId: 'u-1' })

        expect(res.status).toBe(404)
        expect(res.body.error).toBe('Service not found')
    })

    it('rejects a missing userId', async () => {
        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/leave`).send({})

        expect(res.status).toBe(400)
        expect(res.body.details).toContain('userId is required')
    })
})

describe('POST /api/queue/:serviceId/serve-next', () => {
    it('serves the party at the front and stamps servedAt', async () => {
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z' }),
        ])

        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/serve-next`)

        expect(res.status).toBe(200)
        expect(res.body.served.id).toBe('q-1')
        expect(res.body.served.status).toBe('served')
        expect(res.body.served.servedAt).not.toBeNull()
    })

    it('serves by priority, not just arrival order', async () => {
        resetQueue([
            entry({ id: 'q-low', userId: 'u-low', joinedAt: '2026-07-10T18:00:00Z', priority: 'low' }),
            entry({ id: 'q-high', userId: 'u-high', joinedAt: '2026-07-10T18:30:00Z', priority: 'high' }),
        ])

        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/serve-next`)

        expect(res.body.served.id).toBe('q-high')
    })

    it('reports who is now at the front of the line', async () => {
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z' }),
        ])

        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/serve-next`)

        expect(res.body.nowAlmostReady.id).toBe('q-2')
        expect(res.body.nowAlmostReady.status).toBe('almost-ready')
    })

    it('notifies the served party and the newly-promoted party', async () => {
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z' }),
        ])

        await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/serve-next`)

        expect(notifications).toHaveLength(2)
        expect(notifications[0]).toMatchObject({ userId: 'u-1', kind: 'served' })
        expect(notifications[1]).toMatchObject({ userId: 'u-2', kind: 'almost-ready' })
    })

    it('does not send an almost-ready notification when nobody is left to promote', async () => {
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' })])

        await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/serve-next`)

        expect(notifications).toHaveLength(1)
        expect(notifications[0]).toMatchObject({ userId: 'u-1', kind: 'served' })
    })

    it('reports nobody next when it served the last party in line', async () => {
        resetQueue([entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' })])

        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/serve-next`)

        expect(res.body.served.id).toBe('q-1')
        expect(res.body.nowAlmostReady).toBeNull()
    })

    it('works through the whole line in order', async () => {
        const app = createApp()
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z' }),
            entry({ id: 'q-3', userId: 'u-3', joinedAt: '2026-07-10T18:20:00Z' }),
        ])

        const served: string[] = []
        for (let call = 0; call < 3; call += 1) {
            const res = await request(app).post(`/api/queue/${OPEN_SERVICE}/serve-next`)
            served.push(res.body.served.id)
        }

        expect(served).toEqual(['q-1', 'q-2', 'q-3'])
        const lastCall = await request(app).post(`/api/queue/${OPEN_SERVICE}/serve-next`)
        expect(lastCall.status).toBe(404)
    })

    it('skips parties that already left', async () => {
        resetQueue([
            entry({ id: 'q-1', userId: 'u-1', joinedAt: '2026-07-10T18:00:00Z', status: 'left' }),
            entry({ id: 'q-2', userId: 'u-2', joinedAt: '2026-07-10T18:10:00Z' }),
        ])

        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/serve-next`)

        expect(res.body.served.id).toBe('q-2')
    })

    it('returns 404 when nobody is waiting', async () => {
        const res = await request(createApp()).post(`/api/queue/${OPEN_SERVICE}/serve-next`)

        expect(res.status).toBe(404)
        expect(res.body.error).toBe('No one is waiting for this service')
    })

    it('returns 404 for a service that does not exist', async () => {
        const res = await request(createApp()).post('/api/queue/svc-nope/serve-next')

        expect(res.status).toBe(404)
        expect(res.body.error).toBe('Service not found')
    })
})
