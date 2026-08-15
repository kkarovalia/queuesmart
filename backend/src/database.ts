import {
    PrismaClient,
    User,
    UserRole,
    Service,
    ServiceStatus,
    PriorityLevel,
    QueueEntry,
    WaitlistOutcome as PrismaWaitlistOutcome,
    Notification,
    NotificationKind as PrismaNotificationKind,
} from "./generated/prisma/client.js";
import { getCurrentQueue } from "./modules/queue/router.js";
import type { ServiceInput, NotificationKind, WaitlistOutcome, HistoryRecord } from './types.js'

export const prisma = new PrismaClient()

export async function getUserByEmail(email: string): Promise<User | undefined> {
    return await prisma.user.findUnique({ where: { email: email } }) ?? undefined
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
    phone?: string
    email: string
    passwordHash: string
    role: UserRole
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

interface ServiceExtraInfo extends Service {
    queueLength?: number
    userInQueue?: boolean
}

interface GetServicesOptions {
    user?: User
    includeQueueLengths?: boolean
}

export async function getServices(options?: GetServicesOptions): Promise<(Service | ServiceExtraInfo)[]> {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } })
    if (options) {
        return await Promise.all(services.map(async (s) => {
            const queue = await getCurrentQueue(s)
            return {
                ...s,
                queueLength: options.includeQueueLengths ? queue.length : undefined,
                userInQueue: options.user ? (
                    await prisma.queueEntry.count({
                        where: {
                            userId: options.user.id,
                            serviceId: s.id,
                            resolvedAt: { isSet: false }
                        }
                    })
                ) > 0 : undefined
            }
        }))
    } else {
        return services
    }
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

// Scoped to the requesting user's own notifications (userId comes from the
// caller's JWT, never the client) — updateMany rather than update so that
// trying to mark someone else's notification just matches zero rows instead
// of updating it or throwing.
export async function markNotificationRead(notificationId: string, userId: string) {
    const { count } = await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { read: true },
    })
    if (count === 0) return undefined
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } })
    return notification ? toAppNotification(notification) : undefined
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

// --- Reporting (Final Project) ---
// Reports are computed on demand from QueueEntry (which already doubles as
// the history table, per the A4 schema decision — see the note above) rather
// than stored anywhere, since the assignment only asks that they can be
// generated, not that they persist.

export interface ReportDateRange {
    from?: Date
    to?: Date
}

function resolvedAtFilter(range: ReportDateRange) {
    return {
        not: null,
        ...(range.from ? { gte: range.from } : {}),
        ...(range.to ? { lte: range.to } : {}),
    }
}

export interface UserParticipationRow {
    userId: string
    userName: string
    userEmail: string
    serviceId: string
    serviceName: string
    partySize: number
    joinedAt: string
    resolvedAt: string
    outcome: WaitlistOutcome
    waitMinutes: number
}

export async function getUserParticipationReport(
    range: ReportDateRange = {},
    serviceId?: string,
): Promise<UserParticipationRow[]> {
    const entries = await prisma.queueEntry.findMany({
        where: {
            resolvedAt: resolvedAtFilter(range),
            ...(serviceId ? { serviceId } : {}),
        },
        include: { service: true, user: true },
        orderBy: { resolvedAt: 'desc' },
    })

    return entries.map(entry => ({
        userId: entry.userId,
        userName: entry.user.name,
        userEmail: entry.user.email,
        serviceId: entry.serviceId,
        serviceName: entry.service.name,
        partySize: entry.partySize,
        joinedAt: entry.joinedAt.toISOString(),
        resolvedAt: entry.resolvedAt!.toISOString(),
        outcome: fromPrismaOutcome(entry.outcome!),
        waitMinutes: entry.waitMinutes ?? 0,
    }))
}

export interface ServiceActivityRow {
    serviceId: string
    serviceName: string
    status: ServiceStatus
    priority: PriorityLevel
    totalEntries: number
    seatedCount: number
    cancelledCount: number
    noShowCount: number
    averageWaitMinutes: number
}

export async function getServiceActivityReport(
    range: ReportDateRange = {},
    serviceId?: string,
): Promise<ServiceActivityRow[]> {
    const services = await prisma.service.findMany({
        where: serviceId ? { id: serviceId } : undefined,
        orderBy: { name: 'asc' },
    })
    const entries = await prisma.queueEntry.findMany({
        where: { resolvedAt: resolvedAtFilter(range) },
    })

    return services.map(service => {
        const serviceEntries = entries.filter(entry => entry.serviceId === service.id)
        const seatedCount = serviceEntries.filter(entry => entry.outcome === 'seated').length
        const cancelledCount = serviceEntries.filter(entry => entry.outcome === 'cancelled').length
        const noShowCount = serviceEntries.filter(entry => entry.outcome === 'no_show').length
        const averageWaitMinutes = serviceEntries.length
            ? Math.round(
                serviceEntries.reduce((sum, entry) => sum + (entry.waitMinutes ?? 0), 0) / serviceEntries.length,
            )
            : 0

        return {
            serviceId: service.id,
            serviceName: service.name,
            status: service.status,
            priority: service.priority,
            totalEntries: serviceEntries.length,
            seatedCount,
            cancelledCount,
            noShowCount,
            averageWaitMinutes,
        }
    })
}

export interface UsageSummaryReport {
    totalServed: number
    totalCancelled: number
    totalNoShow: number
    averageWaitMinutes: number
    busiestService: { serviceName: string; totalEntries: number } | null
    rangeFrom: string | null
    rangeTo: string | null
}

export async function getUsageSummaryReport(
    range: ReportDateRange = {},
    serviceId?: string,
): Promise<UsageSummaryReport> {
    const activity = await getServiceActivityReport(range, serviceId)
    const totalEntries = activity.reduce((sum, service) => sum + service.totalEntries, 0)
    const weightedWaitSum = activity.reduce(
        (sum, service) => sum + service.averageWaitMinutes * service.totalEntries,
        0,
    )
    const busiest = activity.reduce<ServiceActivityRow | null>(
        (max, service) => (!max || service.totalEntries > max.totalEntries ? service : max),
        null,
    )

    return {
        totalServed: activity.reduce((sum, service) => sum + service.seatedCount, 0),
        totalCancelled: activity.reduce((sum, service) => sum + service.cancelledCount, 0),
        totalNoShow: activity.reduce((sum, service) => sum + service.noShowCount, 0),
        averageWaitMinutes: totalEntries ? Math.round(weightedWaitSum / totalEntries) : 0,
        busiestService: busiest && busiest.totalEntries > 0
            ? { serviceName: busiest.serviceName, totalEntries: busiest.totalEntries }
            : null,
        rangeFrom: range.from?.toISOString() ?? null,
        rangeTo: range.to?.toISOString() ?? null,
    }
}
