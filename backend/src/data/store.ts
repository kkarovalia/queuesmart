import type { AppNotification, HistoryRecord, QueueEntry, Service, User } from '../types.js'
import * as argon2 from "argon2"

// Single in-memory store shared by every module's routes.
// No real database in A3 per the assignment brief; A4 replaces this.
// id '123' matches the placeholder returned by the frontend's useUser() stub
// (src/api.ts) until Ian's auth module issues real sessions.
export const users: User[] = [
    { id: '123', email: 'jamie@example.com', passwordHash: await argon2.hash('demo-user'), role: 'user' },
    { id: 'admin-1', email: 'admin@example.com', passwordHash: await argon2.hash('demo-admin'), role: 'admin' },
]

export const services: Service[] = [
    {
        id: 'svc-1',
        name: 'Dinner Waitlist',
        description: 'General dining room seating for walk-in guests.',
        expectedDurationMinutes: 45,
        priority: 'high',
        status: 'open',
    },
    {
        id: 'svc-2',
        name: 'Bar Seating',
        description: 'First-come bar seats for smaller parties.',
        expectedDurationMinutes: 30,
        priority: 'medium',
        status: 'open',
    },
    {
        id: 'svc-3',
        name: 'Patio Seating',
        description: 'Outdoor seating when weather and capacity allow.',
        expectedDurationMinutes: 40,
        priority: 'medium',
        status: 'open',
    },
    {
        id: 'svc-4',
        name: 'Private Dining',
        description: 'Private room seating for larger parties and special events.',
        expectedDurationMinutes: 120,
        priority: 'high',
        status: 'closed',
    },
]

// Seeded with other demo guests, not user '123' — that id is the frontend's
// own placeholder logged-in user (see api.ts's fetchUser()), and join only
// allows one entry per user per service, so seeding user '123' here would
// permanently block them from ever joining this service themselves.
export const queueEntries: QueueEntry[] = [
    { id: 'q-1', serviceId: 'svc-1', userId: 'demo-guest-1', partySize: 4, status: 'waiting', joinedAt: '2026-07-10T18:12:00Z', servedAt: null },
    { id: 'q-2', serviceId: 'svc-1', userId: 'demo-guest-2', partySize: 2, status: 'waiting', joinedAt: '2026-07-10T18:17:00Z', servedAt: null },
]

export const historyRecords: HistoryRecord[] = [
    {
        id: 'h-1',
        userId: '123',
        serviceId: 'svc-1',
        serviceName: 'Dinner Waitlist',
        partySize: 4,
        joinedAt: '2026-06-19T23:10:00Z',
        resolvedAt: '2026-06-19T23:50:00Z',
        outcome: 'seated',
        waitMinutes: 40,
    },
    {
        id: 'h-2',
        userId: '123',
        serviceId: 'svc-2',
        serviceName: 'Bar Seating',
        partySize: 2,
        joinedAt: '2026-06-02T20:00:00Z',
        resolvedAt: '2026-06-02T20:00:00Z',
        outcome: 'cancelled',
        waitMinutes: 0,
    },
]

export const notifications: AppNotification[] = []
