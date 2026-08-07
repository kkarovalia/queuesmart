import { Router } from 'express'
import { queueEntries, services } from '../../data/store.js'
import type { PriorityLevel, QueueEntry, Service } from '../../types.js'
import { notifyAlmostReady, notifyQueueJoined, notifyServed } from '../notifications/router.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'

export const queueRouter = Router()

// Lower rank number = served earlier.
const PRIORITY_RANK: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 }
const VALID_PRIORITIES: PriorityLevel[] = ['low', 'medium', 'high']

const MAX_USER_ID_LENGTH = 64
const MAX_PARTY_SIZE = 20

// --- Ordering rules -------------------------------------------------------
// These are plain exported functions rather than logic inlined into the route
// handlers, so they can be unit tested directly and so the wait-time module
// can import the same ordering instead of re-implementing it. If wait-time
// sorted differently, its "you are position 3" estimate would disagree with
// who serve-next actually picks.

// A party can carry its own priority (e.g. an accessibility need, or a large
// booking the host wants to bump). When it doesn't, it inherits the priority
// of the service it queued for, which the Service record already carries from
// the service-management module.
export function resolveEntryPriority(entry: QueueEntry, service: Service): PriorityLevel {
    return entry.priority ?? service.priority
}

// Higher priority first, then arrival order (earliest joinedAt) within the
// same priority band. Note this lets a steady stream of high-priority parties
// delay a low-priority one; acceptable for A3 since the brief asks only that
// ordering "consider arrival order and priority", but worth revisiting if we
// ever add ageing to stop long waits.
export function sortQueueEntries(entries: QueueEntry[], service: Service): QueueEntry[] {
    return [...entries].sort((a, b) => {
        const rankDifference =
            PRIORITY_RANK[resolveEntryPriority(a, service)] - PRIORITY_RANK[resolveEntryPriority(b, service)]
        if (rankDifference !== 0) {
            return rankDifference
        }
        return a.joinedAt.localeCompare(b.joinedAt)
    })
}

// The "current queue" is everyone still in line, in the order they'll be
// served. 'almost-ready' still counts as in line: that party has been warned
// they're next but hasn't actually been seated yet.
export function getCurrentQueue(service: Service): QueueEntry[] {
    const stillInLine = queueEntries.filter(
        entry => entry.serviceId === service.id && (entry.status === 'waiting' || entry.status === 'almost-ready'),
    )
    return sortQueueEntries(stillInLine, service)
}

// Keeps exactly one party flagged 'almost-ready': whoever is currently at the
// front of the line. Called after every change to the queue so the flag can
// never go stale — e.g. if a high-priority party joins and jumps the previous
// front-runner, the flag has to move with it.
//
// Returns the entry that *newly* became almost-ready, or null if the front of
// the line didn't change. That return value is the trigger point for the
// notification module: notifyAlmostReady(userId, service.name) goes here once
// Nelson's notifications branch and this one are merged.
export function syncAlmostReady(service: Service): QueueEntry | null {
    const [front, ...rest] = getCurrentQueue(service)

    // Anyone no longer at the front goes back to plain waiting.
    for (const entry of rest) {
        if (entry.status === 'almost-ready') {
            entry.status = 'waiting'
        }
    }

    if (!front || front.status === 'almost-ready') {
        return null
    }
    front.status = 'almost-ready'
    return front
}

// queueEntries is append-only (parties are status-changed, never spliced out),
// but deriving the next id from the highest existing suffix rather than from
// the array length keeps ids unique even if that ever stops being true.
function nextEntryId(): string {
    const highest = queueEntries.reduce((max, entry) => {
        const match = /^q-(\d+)$/.exec(entry.id)
        return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    return `q-${highest + 1}`
}

// --- Routes ---------------------------------------------------------------

// Admin view: the current queue for one service, in serving order, with each
// party's 1-based position attached so the UI doesn't have to re-derive it.
queueRouter.get('/:serviceId', requireAuth, requireRole('admin'), (req, res) => {
    const { serviceId } = req.params
    const service = services.find(item => item.id === serviceId)
    if (!service) {
        res.status(404).json({ error: 'Service not found' })
        return
    }

    const entries = getCurrentQueue(service).map((entry, index) => ({
        ...entry,
        position: index + 1,
        priority: resolveEntryPriority(entry, service),
    }))
    res.json(entries)
})

queueRouter.post('/:serviceId/join', (req, res) => {
    const { serviceId } = req.params
    const { userId, partySize, priority } = req.body ?? {}

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
    } else if (userId.length > MAX_USER_ID_LENGTH) {
        errors.push(`userId must be ${MAX_USER_ID_LENGTH} characters or fewer`)
    }

    if (typeof partySize !== 'number' || !Number.isInteger(partySize)) {
        errors.push('partySize must be a whole number')
    } else if (partySize < 1 || partySize > MAX_PARTY_SIZE) {
        errors.push(`partySize must be between 1 and ${MAX_PARTY_SIZE}`)
    }

    // Optional — omitting it means "inherit the service's priority".
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
        errors.push('priority must be one of low, medium, high')
    }

    if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors })
        return
    }

    // One party per user per service, otherwise a guest could refresh the join
    // screen and quietly take two slots in the same line.
    const alreadyInLine = getCurrentQueue(service).some(entry => entry.userId === userId)
    if (alreadyInLine) {
        res.status(409).json({ error: 'You are already in the queue for this service' })
        return
    }

    const entry: QueueEntry = {
        id: nextEntryId(),
        serviceId,
        userId,
        partySize,
        priority,
        status: 'waiting',
        joinedAt: new Date().toISOString(),
        servedAt: null,
    }
    queueEntries.push(entry)
    notifyQueueJoined(userId, service.name)

    // Joining an empty line makes you the front-runner immediately.
    const promoted = syncAlmostReady(service)
    if (promoted) {
        notifyAlmostReady(promoted.userId, service.name)
    }

    const position = getCurrentQueue(service).findIndex(item => item.id === entry.id) + 1
    res.status(201).json({ ...entry, position })
})

queueRouter.post('/:serviceId/leave', (req, res) => {
    const { serviceId } = req.params
    const { userId } = req.body ?? {}

    const service = services.find(item => item.id === serviceId)
    if (!service) {
        res.status(404).json({ error: 'Service not found' })
        return
    }

    if (typeof userId !== 'string' || !userId.trim()) {
        res.status(400).json({ error: 'Validation failed', details: ['userId is required'] })
        return
    }

    // A party that's already been flagged almost-ready can still change its
    // mind, so both in-line statuses are valid to leave from.
    const entry = getCurrentQueue(service).find(item => item.userId === userId)
    if (!entry) {
        res.status(404).json({ error: 'Active queue entry not found' })
        return
    }

    entry.status = 'left'

    // Whoever was behind them may now be at the front.
    syncAlmostReady(service)

    res.json(entry)
})

// Admin action: seat the party at the front of the line, then promote the next
// one. Returns both, so the admin UI can show who was served and who's now up.
queueRouter.post('/:serviceId/serve-next', requireAuth, requireRole('admin'), (req, res) => {
    const { serviceId } = req.params

    const service = services.find(item => item.id === serviceId)
    if (!service) {
        res.status(404).json({ error: 'Service not found' })
        return
    }

    const [next] = getCurrentQueue(service)
    if (!next) {
        res.status(404).json({ error: 'No one is waiting for this service' })
        return
    }

    next.status = 'served'
    next.servedAt = new Date().toISOString()
    notifyServed(next.userId, service.name)

    const promoted = syncAlmostReady(service)
    if (promoted) {
        notifyAlmostReady(promoted.userId, service.name)
    }

    res.json({ served: next, nowAlmostReady: promoted })
})
