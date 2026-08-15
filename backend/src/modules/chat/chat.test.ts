import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { PrismaClient } from '../../generated/prisma/client.js'
import { signToken } from '../../middleware/auth.js'
import { cancelEntry, joinQueue } from '../../chat.js'

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

beforeAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: 'jamie@example.com' } })
    if (!user) throw new Error('Expected seeded demo user jamie@example.com to exist')

    await prisma.queueEntry.deleteMany({ where: { user: { email: toolTestEmail } } })
    await prisma.service.deleteMany({ where: { name: { startsWith: toolTestServicePrefix } } })
    await prisma.user.deleteMany({ where: { email: toolTestEmail } })

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
        ],
    })
})

beforeEach(async () => {
    await prisma.queueEntry.deleteMany({ where: { user: { email: toolTestEmail } } })
})

afterAll(async () => {
    await prisma.queueEntry.deleteMany({ where: { user: { email: toolTestEmail } } })
    await prisma.service.deleteMany({ where: { name: { startsWith: toolTestServicePrefix } } })
    await prisma.user.deleteMany({ where: { email: toolTestEmail } })
})

describe('POST /api/chat error handling', () => {
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
})
