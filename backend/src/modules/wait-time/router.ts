import { Router } from 'express'
import { services, queueEntries } from '../../data/store.js'
import { getCurrentQueue } from '../queue/router.js'

export const waitTimeRouter = Router()

// Rule-based estimate per the assignment brief: (parties ahead) x (service's
// expected duration). No advanced algorithm required. Kept as its own
// exported function, separate from the HTTP handlers below, so it can be
// unit tested directly without going through supertest.
export function calculateEstimatedWaitMinutes(partiesAhead: number, expectedDurationMinutes: number): number {
    return partiesAhead * expectedDurationMinutes
}

// Aggregate estimate: "if I joined this service right now, how long would
// I wait", based on however many parties are currently in line (waiting or
// already flagged almost-ready — both are still ahead of a brand new
// arrival). Uses getCurrentQueue from the queue module rather than filtering
// queueEntries directly, so this always reflects the queue's real ordering
// (priority, then arrival time) instead of a competing assumption about it.
waitTimeRouter.get('/:serviceId', (req, res) => {
    const { serviceId } = req.params
    const service = services.find(item => item.id === serviceId)
    if (!service) {
        res.status(404).json({ error: 'Service not found' })
        return
    }

    const currentQueue = getCurrentQueue(service)
    const estimatedWaitMinutes = calculateEstimatedWaitMinutes(currentQueue.length, service.expectedDurationMinutes)

    res.json({ serviceId, waitingCount: currentQueue.length, estimatedWaitMinutes })
})

// Per-entry estimate: how long THIS specific queue entry can expect to
// wait, based on its actual position in getCurrentQueue — the same
// priority-then-arrival ordering serve-next uses to pick who's up next.
// This is what the frontend's "my queue status" screen needs (a position
// and estimate for the logged-in user specifically), as opposed to the
// generic aggregate number above.
waitTimeRouter.get('/:serviceId/entry/:entryId', (req, res) => {
    const { serviceId, entryId } = req.params

    const service = services.find(item => item.id === serviceId)
    if (!service) {
        res.status(404).json({ error: 'Service not found' })
        return
    }

    const currentQueue = getCurrentQueue(service)
    const index = currentQueue.findIndex(item => item.id === entryId)

    if (index === -1) {
        // Either the entry doesn't exist at all, or it exists but has
        // already been served/left and is no longer in line. Tell those
        // two cases apart against the full entry list (not just the
        // current queue) so the frontend can show the right message.
        const everExisted = queueEntries.some(item => item.id === entryId && item.serviceId === serviceId)
        res.status(everExisted ? 400 : 404).json(
            everExisted
                ? { error: 'This entry is not currently waiting' }
                : { error: 'Queue entry not found' },
        )
        return
    }

    const position = index + 1
    const partiesAhead = index
    const estimatedWaitMinutes = calculateEstimatedWaitMinutes(partiesAhead, service.expectedDurationMinutes)

    res.json({ entryId, serviceId, position, estimatedWaitMinutes })
})
