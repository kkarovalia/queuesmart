import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app.js'
import { prisma } from '../../database.js'
import type { Service, User } from '../../generated/prisma/client.js'
import { signToken } from '../../middleware/auth.js'

let user1: User
let user2: User
let dinner: Service
let bar: Service
let adminAuth: string
let userAuth: string

const app = createApp()

beforeAll(async () => {
    await prisma.queueEntry.deleteMany({ where: { service: { name: { startsWith: 'Report Test ' } } } })
    await prisma.service.deleteMany({ where: { name: { startsWith: 'Report Test ' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'report-test-' } } })

    user1 = await prisma.user.create({
        data: { name: 'Report Tester One', email: 'report-test-1@example.com', passwordHash: 'not-used', role: 'user' },
    })
    user2 = await prisma.user.create({
        data: { name: 'Report Tester Two', email: 'report-test-2@example.com', passwordHash: 'not-used', role: 'user' },
    })
    dinner = await prisma.service.create({
        data: {
            name: 'Report Test Dinner',
            description: 'Reporting test service',
            expectedDurationMinutes: 45,
            priority: 'high',
            status: 'open',
        },
    })
    bar = await prisma.service.create({
        data: {
            name: 'Report Test Bar',
            description: 'Reporting test service',
            expectedDurationMinutes: 20,
            priority: 'low',
            status: 'closed',
        },
    })

    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } })
    adminAuth = `Bearer ${signToken({ sub: admin.id, role: admin.role })}`
    userAuth = `Bearer ${signToken({ sub: user1.id, role: user1.role })}`
})

afterAll(async () => {
    await prisma.queueEntry.deleteMany({ where: { service: { name: { startsWith: 'Report Test ' } } } })
    await prisma.service.deleteMany({ where: { name: { startsWith: 'Report Test ' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'report-test-' } } })
})

// resolvedAt values are deliberately spread across two days so the date-range
// filter tests have something real to exclude.
const DAY_ONE = new Date('2026-01-01T12:00:00Z')
const DAY_TWO = new Date('2026-01-02T12:00:00Z')

beforeEach(async () => {
    await prisma.queueEntry.deleteMany({ where: { service: { name: { startsWith: 'Report Test ' } } } })
    await prisma.queueEntry.createMany({
        data: [
            // Dinner: 2 seated + 1 cancelled, all on day one.
            {
                serviceId: dinner.id, userId: user1.id, partySize: 2, position: 1,
                status: 'served', outcome: 'seated', waitMinutes: 10, resolvedAt: DAY_ONE,
            },
            {
                serviceId: dinner.id, userId: user2.id, partySize: 4, position: 2,
                status: 'served', outcome: 'seated', waitMinutes: 20, resolvedAt: DAY_ONE,
            },
            {
                serviceId: dinner.id, userId: user1.id, partySize: 1, position: 3,
                status: 'left', outcome: 'cancelled', waitMinutes: 5, resolvedAt: DAY_ONE,
            },
            // Bar: 1 no-show, on day two — outside a day-one-only filter.
            {
                serviceId: bar.id, userId: user2.id, partySize: 2, position: 1,
                status: 'served', outcome: 'no_show', waitMinutes: 15, resolvedAt: DAY_TWO,
            },
            // Still active — must never appear in any report.
            {
                serviceId: dinner.id, userId: user2.id, partySize: 3, position: 4,
                status: 'waiting', resolvedAt: null,
            },
        ],
    })
})

describe('reports module', () => {
    describe('authorization', () => {
        it('rejects an unauthenticated request', async () => {
            const res = await request(app).get('/api/reports/users')
            expect(res.status).toBe(401)
        })

        it('rejects a non-admin user on every report', async () => {
            const users = await request(app).get('/api/reports/users').set('Authorization', userAuth)
            const services = await request(app).get('/api/reports/services').set('Authorization', userAuth)
            const summary = await request(app).get('/api/reports/summary').set('Authorization', userAuth)

            expect(users.status).toBe(403)
            expect(services.status).toBe(403)
            expect(summary.status).toBe(403)
        })
    })

    describe('GET /api/reports/users', () => {
        it('returns one row per resolved entry, excluding still-active ones', async () => {
            const res = await request(app).get('/api/reports/users').set('Authorization', adminAuth)

            expect(res.status).toBe(200)
            const rows = res.body.filter((row: { serviceId: string }) =>
                [dinner.id, bar.id].includes(row.serviceId),
            )
            expect(rows).toHaveLength(4)
            expect(rows.every((row: { outcome: string }) => row.outcome)).toBe(true)
        })

        it('includes readable user and service names, not just ids', async () => {
            const res = await request(app).get('/api/reports/users').set('Authorization', adminAuth)

            const row = res.body.find((r: { userId: string; serviceId: string; outcome: string }) =>
                r.userId === user1.id && r.serviceId === dinner.id && r.outcome === 'seated',
            )
            expect(row).toMatchObject({
                userName: 'Report Tester One',
                serviceName: 'Report Test Dinner',
                waitMinutes: 10,
            })
        })

        it('filters by serviceId', async () => {
            const res = await request(app)
                .get(`/api/reports/users?serviceId=${bar.id}`)
                .set('Authorization', adminAuth)

            expect(res.body.every((row: { serviceId: string }) => row.serviceId === bar.id)).toBe(true)
            expect(res.body.some((row: { outcome: string }) => row.outcome === 'no-show')).toBe(true)
        })

        it('filters by date range, excluding entries resolved outside it', async () => {
            const res = await request(app)
                .get('/api/reports/users?from=2026-01-01T00:00:00Z&to=2026-01-01T23:59:59Z')
                .set('Authorization', adminAuth)

            const serviceIds = res.body.map((row: { serviceId: string }) => row.serviceId)
            expect(serviceIds).toContain(dinner.id)
            expect(serviceIds).not.toContain(bar.id)
        })

        it('includes the full end date submitted by an HTML date input', async () => {
            const res = await request(app)
                .get('/api/reports/users?from=2026-01-01&to=2026-01-01')
                .set('Authorization', adminAuth)

            const serviceIds = res.body.map((row: { serviceId: string }) => row.serviceId)
            expect(serviceIds).toContain(dinner.id)
            expect(serviceIds).not.toContain(bar.id)
        })

        it('rejects an invalid date', async () => {
            const res = await request(app)
                .get('/api/reports/users?from=not-a-date')
                .set('Authorization', adminAuth)

            expect(res.status).toBe(400)
        })

        it('returns CSV when format=csv is requested', async () => {
            const res = await request(app)
                .get(`/api/reports/users?serviceId=${bar.id}&format=csv`)
                .set('Authorization', adminAuth)

            expect(res.status).toBe(200)
            expect(res.headers['content-type']).toContain('text/csv')
            expect(res.headers['content-disposition']).toContain('user-participation-report.csv')
            expect(res.text.split('\n')[0]).toContain('userName')
            expect(res.text).toContain('Report Tester Two')
        })
    })

    describe('GET /api/reports/services', () => {
        it('aggregates counts and average wait per service', async () => {
            const res = await request(app).get('/api/reports/services').set('Authorization', adminAuth)

            const dinnerRow = res.body.find((row: { serviceId: string }) => row.serviceId === dinner.id)
            expect(dinnerRow).toMatchObject({
                serviceName: 'Report Test Dinner',
                status: 'open',
                totalEntries: 3,
                seatedCount: 2,
                cancelledCount: 1,
                noShowCount: 0,
                averageWaitMinutes: Math.round((10 + 20 + 5) / 3),
            })
        })

        it('filters to a single service by serviceId', async () => {
            const res = await request(app)
                .get(`/api/reports/services?serviceId=${bar.id}`)
                .set('Authorization', adminAuth)

            expect(res.body).toHaveLength(1)
            expect(res.body[0]).toMatchObject({ serviceName: 'Report Test Bar', noShowCount: 1 })
        })

        it('returns CSV when format=csv is requested', async () => {
            const res = await request(app)
                .get(`/api/reports/services?serviceId=${dinner.id}&format=csv`)
                .set('Authorization', adminAuth)

            expect(res.headers['content-type']).toContain('text/csv')
            expect(res.text).toContain('Report Test Dinner')
        })
    })

    describe('GET /api/reports/summary', () => {
        it('totals outcomes and picks the busiest service across all services', async () => {
            // Scoped to exactly the DAY_ONE/DAY_TWO fixture window (safely in
            // the past relative to any real run of this suite) rather than
            // querying the summary unscoped — summary has no per-service
            // filter, so an unscoped query would also pick up whatever other
            // test files or manual testing left resolved in the shared dev
            // database, making this assertion flaky.
            const res = await request(app)
                .get('/api/reports/summary?from=2026-01-01T00:00:00Z&to=2026-01-02T23:59:59Z')
                .set('Authorization', adminAuth)

            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({
                totalServed: 2,
                totalCancelled: 1,
                totalNoShow: 1,
                busiestService: { serviceName: 'Report Test Dinner', totalEntries: 3 },
            })
        })

        it('returns zeroed-out totals and no busiest service for a range with no activity', async () => {
            const res = await request(app)
                .get('/api/reports/summary?from=2020-01-01T00:00:00Z&to=2020-01-02T00:00:00Z')
                .set('Authorization', adminAuth)

            expect(res.body).toMatchObject({
                totalServed: 0,
                totalCancelled: 0,
                totalNoShow: 0,
                averageWaitMinutes: 0,
                busiestService: null,
            })
        })

        it('applies the selected service filter to summary totals', async () => {
            const res = await request(app)
                .get(`/api/reports/summary?serviceId=${bar.id}&from=2026-01-01&to=2026-01-02`)
                .set('Authorization', adminAuth)

            expect(res.body).toMatchObject({
                totalServed: 0,
                totalCancelled: 0,
                totalNoShow: 1,
                busiestService: { serviceName: 'Report Test Bar', totalEntries: 1 },
            })
        })

        it('returns a single-row CSV when format=csv is requested', async () => {
            const res = await request(app)
                .get('/api/reports/summary?format=csv')
                .set('Authorization', adminAuth)

            expect(res.headers['content-type']).toContain('text/csv')
            const lines = res.text.trim().split('\n')
            expect(lines).toHaveLength(2)
            expect(lines[0]).toContain('totalServed')
        })
    })
})
