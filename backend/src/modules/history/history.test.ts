import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'

describe('history module', () => {
    it('returns a user\'s history records, most recently resolved first', async () => {
        const app = createApp()
        const res = await request(app).get('/api/history/123')

        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(2)
        expect(res.body[0].id).toBe('h-1')
        expect(res.body[1].id).toBe('h-2')
    })

    it('returns an empty array for a user with no history', async () => {
        const app = createApp()
        const res = await request(app).get('/api/history/nobody')

        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it('returns every user\'s history with customer email attached, for the admin view', async () => {
        const app = createApp()
        const res = await request(app).get('/api/history')

        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(2)
        expect(res.body[0].customerEmail).toBe('jamie@example.com')
        expect(res.body[1].customerEmail).toBe('jamie@example.com')
    })
})
