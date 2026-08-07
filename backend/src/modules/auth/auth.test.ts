import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import * as argon2 from 'argon2'
import { createApp } from '../../app.js'
import { PrismaClient } from '../../generated/prisma/client.js'

// A4: auth is backed by real MongoDB now, which — unlike the old in-memory
// store — persists across separate `npm test` runs, not just across tests
// within one run. A test that registers a new user leaves it in the database
// for next time, which then turns "creates a new user" into an unexpected
// 409 on the second run. Delete anything a previous run created before each
// test, leaving only the two demo accounts docker-compose's seed step
// creates (jamie@example.com / admin@example.com), which the login/duplicate
// tests below depend on already existing.
const prisma = new PrismaClient()
const SEEDED_EMAILS = ['jamie@example.com', 'admin@example.com']

beforeAll(async () => {
    const userPasswordHash = await argon2.hash('demo-user')
    const adminPasswordHash = await argon2.hash('demo-admin')
    await prisma.user.upsert({
        where: { email: 'jamie@example.com' },
        update: { passwordHash: userPasswordHash, role: 'user' },
        create: { email: 'jamie@example.com', passwordHash: userPasswordHash, role: 'user' },
    })
    await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: { passwordHash: adminPasswordHash, role: 'admin' },
        create: { email: 'admin@example.com', passwordHash: adminPasswordHash, role: 'admin' },
    })
})

beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { notIn: SEEDED_EMAILS } } })
})

describe('auth module', () => {
    describe('POST /api/auth/register', () => {
        it('creates a new user and returns a token', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'newuser@example.com', password: 'password123' })

            expect(res.status).toBe(201)
            expect(res.body.token).toBeTypeOf('string')
            expect(res.body.email).toBe('newuser@example.com')
            expect(res.body.role).toBe('user')
        })

        it('rejects a missing email', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/register')
                .send({ password: 'password123' })

            expect(res.status).toBe(400)
            expect(res.body.details).toContain('email is required')
        })

        it('rejects an invalid email format', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'not-an-email', password: 'password123' })

            expect(res.status).toBe(400)
            expect(res.body.details).toContain('email must be a valid email address')
        })

        it('rejects a password under 8 characters', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'shortpass@example.com', password: 'short' })

            expect(res.status).toBe(400)
            expect(res.body.details).toContain('password is required and must be at least 8 characters')
        })

        it('rejects an email that is already registered', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'jamie@example.com', password: 'password123' })

            expect(res.status).toBe(409)
        })
    })

    describe('POST /api/auth/login', () => {
        it('logs in with correct credentials and returns a token', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'admin@example.com', password: 'demo-admin' })

            expect(res.status).toBe(200)
            expect(res.body.token).toBeTypeOf('string')
            expect(res.body.role).toBe('admin')
        })

        it('rejects an email that does not exist', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nobody@example.com', password: 'whatever123' })

            expect(res.status).toBe(401)
        })

        it('rejects the wrong password', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'jamie@example.com', password: 'wrong-password' })

            expect(res.status).toBe(401)
        })

        it('rejects a missing password', async () => {
            const app = createApp()
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'jamie@example.com' })

            expect(res.status).toBe(400)
        })
    })

    describe('GET /api/auth/me', () => {
        it("returns the current user for a valid token", async () => {
            const app = createApp()
            const login = await request(app)
                .post('/api/auth/login')
                .send({ email: 'jamie@example.com', password: 'demo-user' })

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${login.body.token}`)

            expect(res.status).toBe(200)
            expect(res.body.email).toBe('jamie@example.com')
            expect(res.body.role).toBe('user')
        })

        it('rejects a request with no token', async () => {
            const app = createApp()
            const res = await request(app).get('/api/auth/me')

            expect(res.status).toBe(401)
        })

        it('rejects an invalid token', async () => {
            const app = createApp()
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer not-a-real-token')

            expect(res.status).toBe(401)
        })
    })
})
