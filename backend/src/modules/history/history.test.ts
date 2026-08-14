import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockGetByUser = vi.fn()
const mockGetAll = vi.fn()

vi.mock('../../database.js', () => ({
    getHistoryByUserId: (...args: unknown[]) => mockGetByUser(...args),
    getAllHistory: () => mockGetAll(),
}))

// Same approach as notifications.test.ts: database.ts is mocked so these
// tests check this module's routing/response/auth behavior, not Prisma or a
// real database. requireAuth only verifies the JWT signature (no DB lookup),
// so signToken alone is enough to exercise it here.

import { createApp } from '../../app.js'
import { signToken } from '../../middleware/auth.js'

const userAuth = `Bearer ${signToken({ sub: '123', role: 'user' })}`
const adminAuth = `Bearer ${signToken({ sub: 'admin-1', role: 'admin' })}`

describe('history module', () => {
    beforeEach(() => {
        mockGetByUser.mockReset()
        mockGetAll.mockReset()
    })

    describe('GET /api/history/me', () => {
        it("returns the authenticated user's own history records, derived from the JWT", async () => {
            const fakeRecords = [
                { id: 'h-1', userId: '123', serviceId: 'svc-1', serviceName: 'Dinner Waitlist', partySize: 4, joinedAt: 'x', resolvedAt: 'y', outcome: 'seated', waitMinutes: 40 },
            ]
            mockGetByUser.mockResolvedValue(fakeRecords)

            const app = createApp()
            const res = await request(app).get('/api/history/me').set('Authorization', userAuth)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(fakeRecords)
            expect(mockGetByUser).toHaveBeenCalledWith('123')
        })

        it('returns an empty array for a user with no history', async () => {
            mockGetByUser.mockResolvedValue([])

            const app = createApp()
            const res = await request(app).get('/api/history/me').set('Authorization', adminAuth)

            expect(res.status).toBe(200)
            expect(res.body).toEqual([])
        })

        it('rejects a request with no token', async () => {
            const app = createApp()
            const res = await request(app).get('/api/history/me')

            expect(res.status).toBe(401)
            expect(mockGetByUser).not.toHaveBeenCalled()
        })
    })

    describe('GET /api/history (admin view)', () => {
        it("returns every user's history with customer email attached, for an admin", async () => {
            const fakeRecords = [
                { id: 'h-1', userId: '123', serviceId: 'svc-1', serviceName: 'Dinner Waitlist', partySize: 4, joinedAt: 'x', resolvedAt: 'y', outcome: 'seated', waitMinutes: 40, customerEmail: 'jamie@example.com' },
            ]
            mockGetAll.mockResolvedValue(fakeRecords)

            const app = createApp()
            const res = await request(app).get('/api/history').set('Authorization', adminAuth)

            expect(res.status).toBe(200)
            expect(res.body[0].customerEmail).toBe('jamie@example.com')
        })

        it('rejects a non-admin user', async () => {
            const app = createApp()
            const res = await request(app).get('/api/history').set('Authorization', userAuth)

            expect(res.status).toBe(403)
            expect(mockGetAll).not.toHaveBeenCalled()
        })

        it('rejects a request with no token', async () => {
            const app = createApp()
            const res = await request(app).get('/api/history')

            expect(res.status).toBe(401)
        })
    })
})
