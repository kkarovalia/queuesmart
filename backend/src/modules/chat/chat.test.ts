import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { createNotificationRecord } from '../../database.js'
import { PrismaClient } from '../../generated/prisma/client.js'
import { signToken } from '../../middleware/auth.js'
import { cancelEntry, generate, getOpenServices, getUserNotifications, joinQueue } from '../../chat.js'

// Regression test for a real crash: chat/router.ts's POST handler had no
// try/catch around the LLM call, and Express 4 doesn't catch a rejection
// thrown inside an async route handler on its own — so any LLM failure
// (bad model config, rate limit, timeout) became an unhandled rejection
// that crashed the whole Node process for every user, not just the chat
// request that triggered it. Reproduced live via a misconfigured model
// name against a real provider before this fix went in.

vi.mock('../../chat.js', async () => {
    const actual = await vi.importActual<typeof import('../../chat.js')>('../../chat.js')
    return {
        ...actual,
        generate: vi.fn().mockRejectedValue(new Error('LLM provider unavailable')),
    }
})

const prisma = new PrismaClient()
const app = createApp()

const toolTestEmail = 'chat-tool-test@example.com'
const toolTestServicePrefix = 'Chat Tool Test '

async function cleanupToolTestData() {
    await prisma.notification.deleteMany({ where: { user: { email: toolTestEmail } } })
    await prisma.queueEntry.deleteMany({ where: { user: { email: toolTestEmail } } })
    await prisma.service.deleteMany({ where: { name: { startsWith: toolTestServicePrefix } } })
    await prisma.user.deleteMany({ where: { email: toolTestEmail } })
}

beforeAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: 'jamie@example.com' } })
    if (!user) throw new Error('Expected seeded demo user jamie@example.com to exist')

    await cleanupToolTestData()

    await prisma.user.create({
        data: { name: 'Chat Tool Tester', email: toolTestEmail, passwordHash: 'not-used', role: 'user' },
    })
    await prisma.service.createMany({
        data: [
            {
                name: `${toolTestServicePrefix}Patio`, description: 'Chat tool test',
                expectedDurationMinutes: 30, priority: 'medium', status: 'open',
            },
            {
                name: `${toolTestServicePrefix}Bar`, description: 'Chat tool test',
                expectedDurationMinutes: 20, priority: 'medium', status: 'open',
            },
            {
                name: `${toolTestServicePrefix}Closed Lounge`, description: 'Chat tool test',
                expectedDurationMinutes: 20, priority: 'low', status: 'closed',
            },
        ],
    })
})

beforeEach(async () => {
    await prisma.notification.deleteMany({ where: { user: { email: toolTestEmail } } })
    await prisma.queueEntry.deleteMany({ where: { user: { email: toolTestEmail } } })
})

afterAll(cleanupToolTestData)

describe('POST /api/chat', () => {
    it('returns 500 instead of crashing when the LLM call rejects', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: 'jamie@example.com' } })
        const token = signToken({ sub: user.id, role: user.role })

        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'text/plain')
            .send('hello')

        expect(res.status).toBe(500)
        expect(res.body).toEqual({ error: 'Internal server error' })
    })

    it('requires authentication', async () => {
        const res = await request(app).post('/api/chat').set('Content-Type', 'text/plain').send('hi')
        expect(res.status).toBe(401)
    })

    it('returns 404 when the JWT references a user that no longer exists', async () => {
        const token = signToken({ sub: '507f1f77bcf86cd799439099', role: 'user' })

        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'text/plain')
            .send('hello')

        expect(res.status).toBe(404)
    })

    it('returns only the new, non-empty assistant replies', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        const token = signToken({ sub: user.id, role: user.role })
        vi.mocked(generate).mockResolvedValueOnce([
            { role: 'system', content: 'system prompt' },
            { role: 'user', content: 'hello' },
            // A tool-calling round with no text content of its own — the
            // route filters this out, only surfacing replies with real text.
            { role: 'assistant', content: null, tool_calls: [] } as never,
            { role: 'assistant', content: 'Hi there!' },
        ])

        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'text/plain')
            .send('hello')

        expect(res.status).toBe(200)
        expect(res.body).toEqual([{ role: 'assistant', content: 'Hi there!' }])
    })
})

describe('GET /api/chat', () => {
    it('requires authentication', async () => {
        const res = await request(app).get('/api/chat')
        expect(res.status).toBe(401)
    })

    it('returns 404 when the JWT references a user that no longer exists', async () => {
        const token = signToken({ sub: '507f1f77bcf86cd799439099', role: 'user' })
        const res = await request(app).get('/api/chat').set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(404)
    })

    it('returns an empty list before any message has been sent', async () => {
        // chat_history is a shared in-memory map keyed by user id with no
        // reset between tests — using admin here (never touched by any
        // other test in this file) instead of toolTestEmail's user avoids
        // false failures from state left behind by the POST tests above.
        const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } })
        const token = signToken({ sub: admin.id, role: admin.role })

        const res = await request(app).get('/api/chat').set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it('filters stored history down to user/assistant messages with real content', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        const token = signToken({ sub: user.id, role: user.role })
        vi.mocked(generate).mockResolvedValueOnce([
            { role: 'system', content: 'system prompt' },
            { role: 'user', content: 'what can you do?' },
            { role: 'assistant', content: null, tool_calls: [] } as never,
            { role: 'tool', tool_call_id: 'call-1', content: 'tool output' } as never,
            { role: 'assistant', content: 'I can help you join a queue.' },
        ])
        await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'text/plain')
            .send('what can you do?')

        const res = await request(app).get('/api/chat').set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toEqual([
            { role: 'user', content: 'what can you do?' },
            { role: 'assistant', content: 'I can help you join a queue.' },
        ])
    })
})

describe('chat queue tools', () => {
    it('does not join a second queue while another entry is active', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        const services = await prisma.service.findMany({
            where: { name: { startsWith: toolTestServicePrefix } },
            orderBy: { name: 'asc' },
        })
        await prisma.queueEntry.create({
            data: {
                serviceId: services[0].id,
                userId: user.id,
                partySize: 2,
                position: 1,
                status: 'waiting',
            },
        })

        const result = await joinQueue.handler(
            { entry_id: services[1].id, party_size: 2 },
            { user },
        )

        expect(result).toBe('User is already in another queue. Leave it before joining a new one.')
        expect(await prisma.queueEntry.count({
            where: { userId: user.id, resolvedAt: { isSet: false } },
        })).toBe(1)
    })

    it('marks an AI-cancelled entry as left as well as resolved', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        const service = await prisma.service.findFirstOrThrow({
            where: { name: { startsWith: toolTestServicePrefix } },
        })
        const entry = await prisma.queueEntry.create({
            data: {
                serviceId: service.id,
                userId: user.id,
                partySize: 4,
                position: 1,
                status: 'waiting',
            },
        })

        expect(await cancelEntry.handler({ entry_id: entry.id }, { user }))
            .toBe('Queue entry has been cancelled.')
        expect(await prisma.queueEntry.findUniqueOrThrow({ where: { id: entry.id } }))
            .toMatchObject({ status: 'left', outcome: 'cancelled' })
    })

    it('rejects a malformed service id when joining', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        expect(await joinQueue.handler({ entry_id: 'not-a-valid-object-id', party_size: 2 }, { user }))
            .toBe('Invalid id format.')
    })

    it('reports a well-formed but nonexistent service id as not found', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        expect(await joinQueue.handler({ entry_id: '507f1f77bcf86cd799439099', party_size: 2 }, { user }))
            .toBe('Service not found.')
    })

    it('reports rejoining the same service distinctly from joining a different one', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        const service = await prisma.service.findFirstOrThrow({
            where: { name: { startsWith: toolTestServicePrefix }, status: 'open' },
        })
        await prisma.queueEntry.create({
            data: { serviceId: service.id, userId: user.id, partySize: 2, position: 1, status: 'waiting' },
        })

        expect(await joinQueue.handler({ entry_id: service.id, party_size: 2 }, { user }))
            .toBe('User already in this queue.')
    })

    it('actually creates the queue entry on a successful join', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        const service = await prisma.service.findFirstOrThrow({
            where: { name: { startsWith: toolTestServicePrefix }, status: 'open' },
        })

        expect(await joinQueue.handler({ entry_id: service.id, party_size: 3 }, { user }))
            .toBe('User has been added to queue.')
        expect(await prisma.queueEntry.findFirstOrThrow({ where: { userId: user.id, serviceId: service.id } }))
            .toMatchObject({ partySize: 3, status: 'waiting' })
    })

    it('rejects a malformed entry id when cancelling', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        expect(await cancelEntry.handler({ entry_id: 'not-a-valid-object-id' }, { user }))
            .toBe('Invalid id format.')
    })

    it('will not let one user cancel another user\'s entry', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        const jamie = await prisma.user.findUniqueOrThrow({ where: { email: 'jamie@example.com' } })
        const service = await prisma.service.findFirstOrThrow({
            where: { name: { startsWith: toolTestServicePrefix }, status: 'open' },
        })
        const entry = await prisma.queueEntry.create({
            data: { serviceId: service.id, userId: jamie.id, partySize: 2, position: 1, status: 'waiting' },
        })

        try {
            expect(await cancelEntry.handler({ entry_id: entry.id }, { user }))
                .toBe('Entry not found.')
        } finally {
            await prisma.queueEntry.delete({ where: { id: entry.id } })
        }
    })

    it('will not cancel an entry that is already resolved', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        const service = await prisma.service.findFirstOrThrow({
            where: { name: { startsWith: toolTestServicePrefix }, status: 'open' },
        })
        const entry = await prisma.queueEntry.create({
            data: {
                serviceId: service.id, userId: user.id, partySize: 2, position: 1,
                status: 'served', outcome: 'seated', resolvedAt: new Date(),
            },
        })

        expect(await cancelEntry.handler({ entry_id: entry.id }, { user })).toBe('Entry not found.')
    })
})

describe('getUserNotifications tool', () => {
    it('returns the calling user\'s own notifications', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })
        await createNotificationRecord(user.id, 'queue-joined', 'You joined the queue for Chat Tool Test Patio.')

        const result = JSON.parse(await getUserNotifications.handler({}, { user }))

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({ kind: 'queue-joined', message: 'You joined the queue for Chat Tool Test Patio.' })
    })
})

describe('getOpenServices tool', () => {
    it('returns only open services, excluding closed ones', async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: toolTestEmail } })

        const result = JSON.parse(await getOpenServices.handler({}, { user }))
        const names: string[] = result.map((s: { name: string }) => s.name)

        expect(names).toEqual(expect.arrayContaining([
            `${toolTestServicePrefix}Patio`, `${toolTestServicePrefix}Bar`,
        ]))
        expect(names).not.toContain(`${toolTestServicePrefix}Closed Lounge`)
    })
})
