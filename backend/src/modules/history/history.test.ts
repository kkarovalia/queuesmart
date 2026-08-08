import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockGetByUser = vi.fn()
const mockGetAll = vi.fn()

vi.mock('../../database.js', () => ({
    getHistoryByUserId: (...args: unknown[]) => mockGetByUser(...args),
    getAllHistory: () => mockGetAll(),
}))

// Same approach as notifications.test.ts: database.ts is mocked so these
// tests check this module's routing/response behavior, not Prisma or a
// real database.

import { createApp } from '../../app.js'

describe('history module', () => {
    beforeEach(() => {
        mockGetByUser.mockReset()
        mockGetAll.mockReset()
    })

    it("returns a user's history records from database.ts", async () => {
        const fakeRecords = [
            { id: 'h-1', userId: '123', serviceId: 'svc-1', serviceName: 'Dinner Waitlist', partySize: 4, joinedAt: 'x', resolvedAt: 'y', outcome: 'seated', waitMinutes: 40 },
        ]
        mockGetByUser.mockResolvedValue(fakeRecords)

        const app = createApp()
        const res = await request(app).get('/api/history/123')

        expect(res.status).toBe(200)
        expect(res.body).toEqual(fakeRecords)
        expect(mockGetByUser).toHaveBeenCalledWith('123')
    })

    it('returns an empty array for a user with no history', async () => {
        mockGetByUser.mockResolvedValue([])

        const app = createApp()
        const res = await request(app).get('/api/history/nobody')

        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it("returns every user's history with customer email attached, for the admin view", async () => {
        const fakeRecords = [
            { id: 'h-1', userId: '123', serviceId: 'svc-1', serviceName: 'Dinner Waitlist', partySize: 4, joinedAt: 'x', resolvedAt: 'y', outcome: 'seated', waitMinutes: 40, customerEmail: 'jamie@example.com' },
        ]
        mockGetAll.mockResolvedValue(fakeRecords)

        const app = createApp()
        const res = await request(app).get('/api/history')

        expect(res.status).toBe(200)
        expect(res.body[0].customerEmail).toBe('jamie@example.com')
    })
})
