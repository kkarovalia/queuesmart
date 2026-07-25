import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'

describe('app', () => {
    it('responds to a health check', async () => {
        const app = createApp()
        const res = await request(app).get('/api/health')

        expect(res.status).toBe(200)
        expect(res.body).toEqual({ status: 'ok' })
    })
})
