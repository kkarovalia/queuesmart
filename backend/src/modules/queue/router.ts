import { Router } from 'express'
import { getServiceById, getUserById, prisma } from '../../database.js'
import type { PriorityLevel, QueueEntry, Service } from '../../generated/prisma/client.js'
import { requireAuth, requireRole, type AuthedRequest } from '../../middleware/auth.js'
import { notifyAlmostReady, notifyQueueJoined, notifyServed } from '../notifications/router.js'

export const queueRouter = Router()

const PRIORITY_RANK: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 }
const VALID_PRIORITIES: PriorityLevel[] = ['low', 'medium', 'high']
const ACTIVE_STATUSES = ['waiting', 'almost_ready'] as const
const MAX_PARTY_SIZE = 20

export function resolveEntryPriority(entry: QueueEntry, service: Service): PriorityLevel {
    return entry.priority ?? service.priority
}

export function sortQueueEntries(entries: QueueEntry[], service: Service): QueueEntry[] {
    return [...entries].sort((a, b) => {
        const priorityDifference =
            PRIORITY_RANK[resolveEntryPriority(a, service)] - PRIORITY_RANK[resolveEntryPriority(b, service)]
        return priorityDifference || a.joinedAt.getTime() - b.joinedAt.getTime()
    })
}

export async function getCurrentQueue(service: Service): Promise<QueueEntry[]> {
    const entries = await prisma.queueEntry.findMany({
        where: { serviceId: service.id, status: { in: [...ACTIVE_STATUSES] } },
    })
    return sortQueueEntries(entries, service)
}

export async function syncAlmostReady(service: Service): Promise<QueueEntry | null> {
    const [front] = await getCurrentQueue(service)

    await prisma.queueEntry.updateMany({
        where: {
            serviceId: service.id,
            status: 'almost_ready',
            ...(front ? { id: { not: front.id } } : {}),
        },
        data: { status: 'waiting' },
    })

    if (!front || front.status === 'almost_ready') return null

    return prisma.queueEntry.update({
        where: { id: front.id },
        data: { status: 'almost_ready' },
    })
}

function toQueueEntryView(entry: QueueEntry, service: Service, position?: number) {
    return {
        id: entry.id,
        serviceId: entry.serviceId,
        userId: entry.userId,
        partySize: entry.partySize,
        priority: resolveEntryPriority(entry, service),
        status: entry.status === 'almost_ready' ? 'almost-ready' : entry.status,
        joinedAt: entry.joinedAt.toISOString(),
        servedAt: entry.resolvedAt?.toISOString() ?? null,
        ...(position === undefined ? {} : { position }),
    }
}

queueRouter.get('/:serviceId', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const service = await getServiceById(req.params.serviceId)
        if (!service) {
            res.status(404).json({ error: 'Service not found' })
            return
        }

        const entries = (await getCurrentQueue(service)).map((entry, index) =>
            toQueueEntryView(entry, service, index + 1),
        )
        res.json(entries)
    } catch (error) {
        next(error)
    }
})

queueRouter.post('/:serviceId/join', requireAuth, async (req: AuthedRequest, res, next) => {
    try {
        const { partySize, priority } = req.body ?? {}
        const errors: string[] = []

        if (typeof partySize !== 'number' || !Number.isInteger(partySize)) {
            errors.push('partySize must be a whole number')
        } else if (partySize < 1 || partySize > MAX_PARTY_SIZE) {
            errors.push(`partySize must be between 1 and ${MAX_PARTY_SIZE}`)
        }
        if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
            errors.push('priority must be one of low, medium, high')
        }
        if (errors.length > 0) {
            res.status(400).json({ error: 'Validation failed', details: errors })
            return
        }

        const service = await getServiceById(req.params.serviceId)
        if (!service) {
            res.status(404).json({ error: 'Service not found' })
            return
        }
        if (service.status !== 'open') {
            res.status(400).json({ error: 'This service is not currently open' })
            return
        }

        const userId = req.user!.sub
        if (!await getUserById(userId)) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const existing = await prisma.queueEntry.findFirst({
            where: { serviceId: service.id, userId, status: { in: [...ACTIVE_STATUSES] } },
        })
        if (existing) {
            res.status(409).json({ error: 'You are already in the queue for this service' })
            return
        }

        const entry = await prisma.queueEntry.create({
            data: {
                serviceId: service.id,
                userId,
                partySize,
                priority,
                status: 'waiting',
            },
        })
        notifyQueueJoined(userId, service.name)

        const promoted = await syncAlmostReady(service)
        if (promoted) notifyAlmostReady(promoted.userId, service.name)

        const currentQueue = await getCurrentQueue(service)
        const persistedEntry = currentQueue.find(item => item.id === entry.id) ?? entry
        const position = currentQueue.findIndex(item => item.id === entry.id) + 1
        res.status(201).json(toQueueEntryView(persistedEntry, service, position))
    } catch (error) {
        next(error)
    }
})

queueRouter.post('/:serviceId/leave', requireAuth, async (req: AuthedRequest, res, next) => {
    try {
        const service = await getServiceById(req.params.serviceId)
        if (!service) {
            res.status(404).json({ error: 'Service not found' })
            return
        }

        const entry = await prisma.queueEntry.findFirst({
            where: {
                serviceId: service.id,
                userId: req.user!.sub,
                status: { in: [...ACTIVE_STATUSES] },
            },
        })
        if (!entry) {
            res.status(404).json({ error: 'Active queue entry not found' })
            return
        }

        const left = await prisma.queueEntry.update({
            where: { id: entry.id },
            data: { status: 'left', resolvedAt: new Date(), outcome: 'cancelled' },
        })
        const promoted = await syncAlmostReady(service)
        if (promoted) notifyAlmostReady(promoted.userId, service.name)

        res.json(toQueueEntryView(left, service))
    } catch (error) {
        next(error)
    }
})

queueRouter.post('/:serviceId/serve-next', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const service = await getServiceById(req.params.serviceId)
        if (!service) {
            res.status(404).json({ error: 'Service not found' })
            return
        }

        const [nextEntry] = await getCurrentQueue(service)
        if (!nextEntry) {
            res.status(404).json({ error: 'No one is waiting for this service' })
            return
        }

        const resolvedAt = new Date()
        const served = await prisma.queueEntry.update({
            where: { id: nextEntry.id },
            data: {
                status: 'served',
                resolvedAt,
                outcome: 'seated',
                waitMinutes: Math.max(0, Math.round((resolvedAt.getTime() - nextEntry.joinedAt.getTime()) / 60_000)),
            },
        })
        notifyServed(served.userId, service.name)

        const promoted = await syncAlmostReady(service)
        if (promoted) notifyAlmostReady(promoted.userId, service.name)

        res.json({
            served: toQueueEntryView(served, service),
            nowAlmostReady: promoted ? toQueueEntryView(promoted, service) : null,
        })
    } catch (error) {
        next(error)
    }
})
