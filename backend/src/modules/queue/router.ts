import { Router } from 'express'
import { queueEntries, services } from '../../data/store.js'
import type { QueueEntry } from '../../types.js'

export const queueRouter = Router()

// TODO(Kashf): this is a starting point, not a finished module.
// Queue ordering here is arrival-order only - the assignment brief also
// wants priority considered (services already carry a PriorityLevel).
// 'serve-next' currently just takes the front of the arrival-ordered list;
// almost-ready/served transitions and notification triggers still need
// to be hooked up (see modules/notifications).

queueRouter.get('/:serviceId', (req, res) => {
    const { serviceId } = req.params
    const entries = queueEntries
        .filter(entry => entry.serviceId === serviceId && entry.status === 'waiting')
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    res.json(entries)
})

queueRouter.post('/:serviceId/join', (req, res) => {
    const { serviceId } = req.params
    const { userId, partySize } = req.body ?? {}

    const service = services.find(item => item.id === serviceId)
    if (!service) {
        res.status(404).json({ error: 'Service not found' })
        return
    }
    if (service.status !== 'open') {
        res.status(400).json({ error: 'This service is not currently open' })
        return
    }

    const errors: string[] = []
    if (typeof userId !== 'string' || !userId.trim()) {
        errors.push('userId is required')
    }
    if (typeof partySize !== 'number' || partySize <= 0) {
        errors.push('partySize must be a positive number')
    }
    if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors })
        return
    }

    const entry: QueueEntry = {
        id: `q-${queueEntries.length + 1}`,
        serviceId,
        userId,
        partySize,
        status: 'waiting',
        joinedAt: new Date().toISOString(),
        servedAt: null,
    }
    queueEntries.push(entry)
    res.status(201).json(entry)
})

queueRouter.post('/:serviceId/leave', (req, res) => {
    const { serviceId } = req.params
    const { userId } = req.body ?? {}

    const entry = queueEntries.find(
        item => item.serviceId === serviceId && item.userId === userId && item.status === 'waiting',
    )
    if (!entry) {
        res.status(404).json({ error: 'Active queue entry not found' })
        return
    }
    entry.status = 'left'
    res.json(entry)
})

queueRouter.post('/:serviceId/serve-next', (req, res) => {
    const { serviceId } = req.params
    const next = queueEntries
        .filter(entry => entry.serviceId === serviceId && entry.status === 'waiting')
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))[0]

    if (!next) {
        res.status(404).json({ error: 'No one is waiting for this service' })
        return
    }
    next.status = 'served'
    next.servedAt = new Date().toISOString()
    res.json(next)
})
