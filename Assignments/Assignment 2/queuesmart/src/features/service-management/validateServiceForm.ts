import type { PriorityLevel } from '../../contracts/types'

export interface ServiceFormValues {
    name: string
    description: string
    expectedDurationMinutes: string
    priority: PriorityLevel
}

export interface ServiceFormErrors {
    name?: string
    description?: string
    expectedDurationMinutes?: string
}

export function validateServiceForm(values: ServiceFormValues): ServiceFormErrors {
    const errors: ServiceFormErrors = {}

    const trimmedName = values.name.trim()
    if (!trimmedName) {
        errors.name = 'Service name is required.'
    } else if (trimmedName.length > 100) {
        errors.name = 'Service name must be 100 characters or fewer.'
    }

    if (!values.description.trim()) {
        errors.description = 'Description is required.'
    }

    const duration = Number(values.expectedDurationMinutes)
    if (!values.expectedDurationMinutes.trim()) {
        errors.expectedDurationMinutes = 'Expected duration is required.'
    } else if (!Number.isFinite(duration) || duration <= 0) {
        errors.expectedDurationMinutes = 'Expected duration must be a positive number.'
    }

    return errors
}
