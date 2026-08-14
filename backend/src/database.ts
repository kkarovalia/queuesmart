import {
    PrismaClient,
    User,
    UserRole,
    Service,
    QueueEntry,
    WaitlistOutcome as PrismaWaitlistOutcome,
    Notification,
    NotificationKind as PrismaNotificationKind,
} from "./generated/prisma/client.js";
import type { ServiceInput, NotificationKind, WaitlistOutcome, HistoryRecord } from './types.js'

export const prisma = new PrismaClient()

// Important stuff for A4:
// getUserByEmail shows one of many ways to interact with the db using prisma.
// You can run the full application stack using docker compose.
//
// Running dev environment with live editing
// docker compose -f docker-compose.yml -f docker-compose.dev.yml up
//
// Build and run production images
// docker compose up --build
//
// If switching between prod and dev:
// Run docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
// OR
// docker compose build --no-cache
//
// HistoryRecord has been merged with QueueEntry via optional fields outcome and waitMinutes.
// resolvedAt and servedAt are now one optional resolvedAt field.
// 
// QueueEntry is unconstrained and needs backend logic to prevent duplicates.
//
// There are only 4 models in the database so this file won't need much work.
// Check modules to see if the prisma types are compatible. 
//
// PS - Frontend needs fixing. It's still set up like a demo for A2.

export async function getUserByEmail(email: string): Promise<User | undefined> {
    // Working prisma example
    return await prisma.user.findUnique({ where: { email: email } }) ?? undefined // Prisma returns null so must convert
}

export async function getUserById(id: string): Promise<User | undefined> {
    try {
        return await prisma.user.findUnique({ where: { id } }) ?? undefined
    } catch {
        // Mongo ids are ObjectIds under the hood; Prisma throws rather than
        // returning null for a string that isn't validly-shaped, which would
        // otherwise turn a stale/forged JWT `sub` into a 500 instead of the
        // 404 the auth router expects for "no such user".
        return undefined
    }
}

export interface NewUserInput {
    name: string
    email: string
    passwordHash: string
    role: UserRole
    phone?: string
}

export class EmailAlreadyRegisteredError extends Error {
    constructor(email: string) {
        super(`Email already registered: ${email}`)
        this.name = 'EmailAlreadyRegisteredError'
    }
}

export async function createUser(input: NewUserInput): Promise<User> {
    try {
        return await prisma.user.create({ data: input })
    } catch (error) {
        // P2002 = Prisma's unique-constraint-violation code, thrown here if
        // two registrations for the same email race each other between the
        // auth router's own getUserByEmail check and this insert.
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
            throw new EmailAlreadyRegisteredError(input.email)
        }
        throw error
    }
}

export async function getServices(): Promise<Service[]> {
    return prisma.service.findMany({ orderBy: { name: 'asc' } })
}

export async function getServiceById(id: string): Promise<Service | undefined> {
    try {
        return await prisma.service.findUnique({ where: { id } }) ?? undefined
    } catch {
        return undefined
    }
}

export async function createService(input: ServiceInput): Promise<Service> {
    return prisma.service.create({ data: { ...input, status: 'open' } })
}

export async function updateService(id: string, input: ServiceInput): Promise<Service | undefined> {
    try {
        return await prisma.service.update({ where: { id }, data: input })
    } catch {
        return undefined
    }
}

const NOTIFICATION_KIND_TO_PRISMA: Record<NotificationKind, PrismaNotificationKind> = {
    'queue-joined': 'queue_joined',
    'almost-ready': 'almost_ready',
    'served': 'served',
}

const NOTIFICATION_KIND_FROM_PRISMA: Record<PrismaNotificationKind, NotificationKind> = {
    queue_joined: 'queue-joined',
    almost_ready: 'almost-ready',
    served: 'served',
}

function toPrismaNotificationKind(kind: NotificationKind): PrismaNotificationKind {
    return NOTIFICATION_KIND_TO_PRISMA[kind]
}

function fromPrismaNotificationKind(kind: PrismaNotificationKind): NotificationKind {
    return NOTIFICATION_KIND_FROM_PRISMA[kind]
}

const OUTCOME_TO_PRISMA: Record<WaitlistOutcome, PrismaWaitlistOutcome> = {
    seated: 'seated',
    cancelled: 'cancelled',
    'no-show': 'no_show',
}

const OUTCOME_FROM_PRISMA: Record<PrismaWaitlistOutcome, WaitlistOutcome> = {
    seated: 'seated',
    cancelled: 'cancelled',
    no_show: 'no-show',
}

export function toPrismaOutcome(outcome: WaitlistOutcome): PrismaWaitlistOutcome {
    return OUTCOME_TO_PRISMA[outcome]
}

function fromPrismaOutcome(outcome: PrismaWaitlistOutcome): WaitlistOutcome {
    return OUTCOME_FROM_PRISMA[outcome]
}

function toAppNotification(notification: Notification) {
    return {
        id: notification.id,
        userId: notification.userId,
        kind: fromPrismaNotificationKind(notification.kind),
        message: notification.message,
        createdAt: notification.createdAt.toISOString(),
        read: notification.read,
    }
}

export async function createNotificationRecord(userId: string, kind: NotificationKind, message: string) {
    const notification = await prisma.notification.create({
        data: {
            userId,
            kind: toPrismaNotificationKind(kind),
            message,
            read: false,
        },
    })
    return toAppNotification(notification)
}

export async function getNotificationsByUserId(userId: string) {
    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    })
    return notifications.map(toAppNotification)
}

export async function markNotificationRead(notificationId: string) {
    try {
        const notification = await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true },
        })
        return toAppNotification(notification)
    } catch {
        return undefined
    }
}

export async function toggleServiceStatus(id: string): Promise<Service | undefined> {
    const service = await getServiceById(id)
    if (!service) return undefined
    return prisma.service.update({
        where: { id },
        data: { status: service.status === 'open' ? 'closed' : 'open' },
    })
}

function toHistoryRecord(
    entry: QueueEntry & { service: { name: string } },
): HistoryRecord {
    return {
        id: entry.id,
        userId: entry.userId,
        serviceId: entry.serviceId,
        serviceName: entry.service.name,
        partySize: entry.partySize,
        joinedAt: entry.joinedAt.toISOString(),
        resolvedAt: entry.resolvedAt!.toISOString(),
        outcome: fromPrismaOutcome(entry.outcome!),
        waitMinutes: entry.waitMinutes ?? 0,
    }
}

export async function getHistoryByUserId(userId: string) {
    try {
        const entries = await prisma.queueEntry.findMany({
            where: { userId, resolvedAt: { not: null } },
            include: { service: true },
            orderBy: { resolvedAt: 'desc' },
        })
        return entries.map(toHistoryRecord)
    } catch (error) {
        console.log(error)
        return []
    }
}

export async function getAllHistory() {
    const entries = await prisma.queueEntry.findMany({
        where: { resolvedAt: { not: null } },
        include: { service: true, user: true },
        orderBy: { resolvedAt: 'desc' },
    })
    return entries.map((entry: QueueEntry & { service: { name: string }; user: { email: string } }) => ({
        ...toHistoryRecord(entry),
        customerEmail: entry.user.email,
    }))
}
