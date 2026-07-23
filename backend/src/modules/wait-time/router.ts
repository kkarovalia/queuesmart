import { Router } from 'express'
import { queueEntries, services } from '../../data/store.js'

export const waitTimeRouter = Router()

// TODO(Nelson): this is a starting point, not a finished module.
// Estimate is rule-based per the assignment brief (position * expected
// duration) - no advanced algorithm required, but feel free to refine.

waitTimeRouter.get('/:serviceId', (req, res) => {
    const { serviceId } = req.params
    const service = services.find(item => item.id === serviceId)
    if (!service) {
        res.status(404).json({ error: 'Service not found' })
        return
    }

    const waitingCount = queueEntries.filter(
        entry => entry.serviceId === serviceId && entry.status === 'waiting',
    ).length
    const estimatedWaitMinutes = waitingCount * service.expectedDurationMinutes

    res.json({ serviceId, waitingCount, estimatedWaitMinutes })
})
