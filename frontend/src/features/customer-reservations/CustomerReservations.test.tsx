import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CustomerReservationsPage } from './CustomerReservationsPage'

describe('customer reservations', () => {
    it('keeps reservations separate from queues and validates the booking date', async () => {
        const user = userEvent.setup()
        render(<QueryClientProvider client={new QueryClient()}><CustomerReservationsPage /></QueryClientProvider>)
        expect(screen.getByText(/reservations do not enter the walk-in queue/i)).toBeInTheDocument()
        await user.clear(screen.getByLabelText(/date and time/i))
        await user.click(screen.getByRole('button', { name: /reserve table/i }))
        expect(screen.getByText(/choose a reservation date and time/i)).toBeInTheDocument()
        expect(await screen.findByText('Bistro 42', {}, { timeout: 3000 })).toBeInTheDocument()
    })
})
