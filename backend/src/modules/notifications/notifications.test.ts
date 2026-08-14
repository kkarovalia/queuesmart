import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockCreate = vi.fn()
const mockGetByUser = vi.fn()
const mockMarkRead = vi.fn()

vi.mock('../../database.js', () => ({
    createNotificationRecord: (...args: unknown[]) => mockCreate(...args),
    getNotificationsByUserId: (...args: unknown[]) => mockGetByUser(...args),
    markNotificationRead: (...args: unknown[]) => mockMarkRead(...args),
}))

import { notifyQueueJoined, notifyAlmostReady, notifyServed } from './router.js'
import { createApp } from '../../app.js'
import { signToken } from '../../middleware/auth.js'

const userAuth = `Bearer ${signToken({ sub: 'user-1', role: 'user' })}`

describe('notifications module', () => {
    beforeEach(() => {
        mockCreate.mockReset()
        mockGetByUser.mockReset()
        mockMarkRead.mockReset()
    })

    describe('notify* helpers (core business logic)', () => {
        it('creates a queue-joined notification with the right kind and message', async () => {
            mockCreate.mockResolvedValue({ id: 'n-1', userId: 'user-1', kind: 'queue-joined', message: 'x', createdAt: 'x', read: false })

            await notifyQueueJoined('user-1', 'Dinner Waitlist')

            expect(mockCreate).toHaveBeenCalledWith('user-1', 'queue-joined', 'You joined the queue for Dinner Waitlist.')
        })

        it('creates an almost-ready notification with the right kind and message', async () => {
            mockCreate.mockResolvedValue({})
            await notifyAlmostReady('user-2', 'Bar Seating')
            expect(mockCreate).toHaveBeenCalledWith('user-2', 'almost-ready', "You're almost up for Bar Seating. Please be ready.")
        })

        it('creates a served notification with the right kind and message', async () => {
            mockCreate.mockResolvedValue({})
            await notifyServed('user-3', 'Patio Seating')
            expect(mockCreate).toHaveBeenCalledWith('user-3', 'served', "You've been served for Patio Seating. Enjoy!")
        })
    })

    describe('GET /api/notifications/me', () => {
        it("returns the authenticated user's own notifications, derived from the JWT", async () => {
            const fakeNotifications = [{ id: 'n-1', userId: 'user-1', kind: 'queue-joined', message: 'hi', createdAt: 'x', read: false }]
            mockGetByUser.mockResolvedValue(fakeNotifications)

            const app = createApp()
            const res = await request(app).get('/api/notifications/me').set('Authorization', userAuth)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(fakeNotifications)
            expect(mockGetByUser).toHaveBeenCalledWith('user-1')
        })

        it('rejects a request with no token', async () => {
            const app = createApp()
            const res = await request(app).get('/api/notifications/me')

            expect(res.status).toBe(401)
            expect(mockGetByUser).not.toHaveBeenCalled()
        })
    })

    describe('POST /api/notifications/:notificationId/read', () => {
        it('marks a notification as read, scoped to the authenticated user', async () => {
            mockMarkRead.mockResolvedValue({ id: 'n-1', userId: 'user-1', kind: 'queue-joined', message: 'hi', createdAt: 'x', read: true })

            const app = createApp()
            const res = await request(app).post('/api/notifications/n-1/read').set('Authorization', userAuth)

            expect(res.status).toBe(200)
            expect(res.body.read).toBe(true)
            expect(mockMarkRead).toHaveBeenCalledWith('n-1', 'user-1')
        })

        it("returns 404 when database.ts reports the notification doesn't exist or isn't the caller's", async () => {
            mockMarkRead.mockResolvedValue(undefined)

            const app = createApp()
            const res = await request(app).post('/api/notifications/does-not-exist/read').set('Authorization', userAuth)

            expect(res.status).toBe(404)
        })

        it('rejects a request with no token', async () => {
            const app = createApp()
            const res = await request(app).post('/api/notifications/n-1/read')

            expect(res.status).toBe(401)
            expect(mockMarkRead).not.toHaveBeenCalled()
        })
    })
})
