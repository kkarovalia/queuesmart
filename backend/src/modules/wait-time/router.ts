import { Router } from 'express'
import { getServiceById, prisma } from '../../database.js'
import { requireAuth, type AuthedRequest } from '../../middleware/auth.js'
import { getCurrentQueue } from '../queue/router.js'

export const waitTimeRouter = Router()

export function calculateEstimatedWaitMinutes(partiesAhead: number, expectedDurationMinutes: number): number {
    return partiesAhead * expectedDurationMinutes
}

waitTimeRouter.get('/:serviceId', async (req, res, next) => {
    try {
        const service = await getServiceById(req.params.serviceId)
        if (!service) {
            res.status(404).json({ error: 'Service not found' })
            return
        }

        const currentQueue = await getCurrentQueue(service)
        res.json({
            serviceId: service.id,
            waitingCount: currentQueue.length,
            estimatedWaitMinutes: calculateEstimatedWaitMinutes(
                currentQueue.length,
                service.expectedDurationMinutes,
            ),
        })
    } catch (error) {
        next(error)
    }
})

waitTimeRouter.get('/:serviceId/entry/:entryId', requireAuth, async (req: AuthedRequest, res, next) => {
    try {
        const service = await getServiceById(req.params.serviceId)
        if (!service) {
            res.status(404).json({ error: 'Service not found' })
            return
        }

        const entry = await prisma.queueEntry.findUnique({ where: { id: req.params.entryId } }).catch(() => null)
        if (!entry || entry.serviceId !== service.id || entry.userId !== req.user!.sub) {
            res.status(404).json({ error: 'Queue entry not found' })
            return
        }

        const currentQueue = await getCurrentQueue(service)
        const index = currentQueue.findIndex(item => item.id === entry.id)
        if (index === -1) {
            res.status(400).json({ error: 'This entry is not currently waiting' })
            return
        }

        res.json({
            entryId: entry.id,
            serviceId: service.id,
            position: index + 1,
            estimatedWaitMinutes: calculateEstimatedWaitMinutes(index, service.expectedDurationMinutes),
        })
    } catch (error) {
        next(error)
    }
})
