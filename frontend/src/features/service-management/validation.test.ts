import { describe, expect, it } from 'vitest'
import { validateServiceForm } from './validateServiceForm'
import { validateReservationForm } from '../reservation-management/validateReservationForm'

describe('management form validation', () => {
    it('requires service fields and a positive duration', () => {
        const errors = validateServiceForm({ name: '', description: '', expectedDurationMinutes: '0', priority: 'medium' })
        expect(errors.name).toMatch(/required/i)
        expect(errors.description).toMatch(/required/i)
        expect(errors.expectedDurationMinutes).toMatch(/positive/i)
    })

    it('limits service names to 100 characters', () => {
        const errors = validateServiceForm({ name: 'x'.repeat(101), description: 'Dining', expectedDurationMinutes: '30', priority: 'high' })
        expect(errors.name).toMatch(/100 characters/i)
    })

    it('requires reservation guest, party size, and date', () => {
        const errors = validateReservationForm({ customerName: '', partySize: '', dateTime: '', tableId: '' })
        expect(errors.customerName).toMatch(/required/i)
        expect(errors.partySize).toMatch(/required/i)
        expect(errors.dateTime).toMatch(/required/i)
    })
})
