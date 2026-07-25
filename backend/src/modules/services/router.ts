import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { createService, getServices, toggleServiceStatus, updateService } from '../../database.js'
import type { PriorityLevel, ServiceInput } from '../../types.js'

export const servicesRouter = Router()

interface ValidationResult {
    errors: string[]
    value?: ServiceInput
}

function validateServiceInput(body: unknown): ValidationResult {
    const { name, description, expectedDurationMinutes, priority } = (body ?? {}) as Record<string, unknown>
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
    if (!validPriorities.includes(priority as PriorityLevel)) {
        errors.push('priority must be one of low, medium, high')
    }

    if (errors.length > 0) return { errors }
    return {
        errors: [],
        value: {
            name: name as string,
            description: description as string,
            expectedDurationMinutes: expectedDurationMinutes as number,
            priority: priority as PriorityLevel,
        },
    }
}

servicesRouter.get('/', async (_req, res) => {
    res.json(await getServices())
})

servicesRouter.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    const { errors, value } = validateServiceInput(req.body)
    if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors })
        return
    }

    const service = await createService(value!)
    res.status(201).json(service)
})

servicesRouter.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const { errors, value } = validateServiceInput(req.body)
    if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors })
        return
    }

    const updated = await updateService(req.params.id, value!)
    if (!updated) {
        res.status(404).json({ error: 'Service not found' })
        return
    }
    res.json(updated)
})

servicesRouter.patch('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
    const updated = await toggleServiceStatus(req.params.id)
    if (!updated) {
        res.status(404).json({ error: 'Service not found' })
        return
    }
    res.json(updated)
})