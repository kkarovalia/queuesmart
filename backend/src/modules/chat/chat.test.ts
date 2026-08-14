import { beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { PrismaClient } from '../../generated/prisma/client.js'
import { signToken } from '../../middleware/auth.js'

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

beforeAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: 'jamie@example.com' } })
    if (!user) throw new Error('Expected seeded demo user jamie@example.com to exist')
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
