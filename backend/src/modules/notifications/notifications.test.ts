import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { notifyQueueJoined, notifyAlmostReady, notifyServed } from './router.js'
import { notifications } from '../../data/store.js'

describe('notifications module', () => {
    describe('notify* helpers (core business logic)', () => {
        it('creates a queue-joined notification', () => {
            const before = notifications.length
            const note = notifyQueueJoined('test-user-1', 'Dinner Waitlist')

            expect(note.kind).toBe('queue-joined')
            expect(note.userId).toBe('test-user-1')
            expect(note.message).toContain('Dinner Waitlist')
            expect(note.read).toBe(false)
            expect(notifications.length).toBe(before + 1)
        })

        it('creates an almost-ready notification', () => {
            const note = notifyAlmostReady('test-user-2', 'Bar Seating')
            expect(note.kind).toBe('almost-ready')
        })

        it('creates a served notification', () => {
            const note = notifyServed('test-user-3', 'Patio Seating')
            expect(note.kind).toBe('served')
        })
    })

    describe('GET /api/notifications/:userId', () => {
        it("returns only that user's notifications, newest first", async () => {
            const app = createApp()
            notifyQueueJoined('history-test-user', 'Dinner Waitlist')
            notifyAlmostReady('history-test-user', 'Dinner Waitlist')

            const res = await request(app).get('/api/notifications/history-test-user')

            expect(res.status).toBe(200)
            expect(res.body.length).toBeGreaterThanOrEqual(2)
            expect(res.body.every((n: { userId: string }) => n.userId === 'history-test-user')).toBe(true)
        })

        it('returns an empty array for a user with no notifications', async () => {
            const app = createApp()
            const res = await request(app).get('/api/notifications/nobody-has-notified-this-user')

            expect(res.status).toBe(200)
            expect(res.body).toEqual([])
        })
    })

    describe('POST /api/notifications/:notificationId/read', () => {
        it('marks a notification as read', async () => {
            const app = createApp()
            const note = notifyQueueJoined('read-test-user', 'Dinner Waitlist')

            const res = await request(app).post(`/api/notifications/${note.id}/read`)

            expect(res.status).toBe(200)
            expect(res.body.read).toBe(true)
        })

        it('returns 404 for an unknown notification id', async () => {
            const app = createApp()
            const res = await request(app).post('/api/notifications/does-not-exist/read')

            expect(res.status).toBe(404)
        })
    })
})
