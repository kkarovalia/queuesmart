import { Router } from 'express'
import { services } from '../../data/store.js'
import type { PriorityLevel, Service } from '../../types.js'

export const servicesRouter = Router()

// TODO(Ian): this is a starting point, not a finished module.
// Still needed: PUT /:id (update), and probably open/close as its own
// action. Feel free to add a services.test.ts alongside this file
// (see modules/history for a test pattern using supertest).

servicesRouter.get('/', (_req, res) => {
    res.json(services)
})

servicesRouter.post('/', (req, res) => {
    const { name, description, expectedDurationMinutes, priority } = req.body ?? {}
    const errors: string[] = []

    if (typeof name !== 'string' || !name.trim()) {
        errors.push('name is required')
    } else if (name.length > 100) {
        errors.push('name must be 100 characters or fewer')
    }

    if (typeof description !== 'string' || !description.trim()) {
        errors.push('description is required')
    }

    if (typeof expectedDurationMinutes !== 'number' || expectedDurationMinutes <= 0) {
        errors.push('expectedDurationMinutes must be a positive number')
    }

    const validPriorities: PriorityLevel[] = ['low', 'medium', 'high']
    if (!validPriorities.includes(priority)) {
        errors.push('priority must be one of low, medium, high')
    }

    if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors })
        return
    }

    const service: Service = {
        id: `svc-${services.length + 1}`,
        name,
        description,
        expectedDurationMinutes,
        priority,
        status: 'open',
    }
    services.push(service)
    res.status(201).json(service)
})
