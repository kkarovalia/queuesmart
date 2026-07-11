import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { HistoryPage } from './HistoryPage'

describe('history', () => {
    it('renders history rows and filters outcomes', async () => {
        const user = userEvent.setup()
        render(<QueryClientProvider client={new QueryClient()}><HistoryPage /></QueryClientProvider>)
        expect(await screen.findByText('Dinner Waitlist', {}, { timeout: 3000 })).toBeInTheDocument()
        await user.selectOptions(screen.getByLabelText(/filter by outcome/i), 'cancelled')
        expect(screen.getByText('Bar Seating')).toBeInTheDocument()
        expect(screen.queryByText('Dinner Waitlist')).not.toBeInTheDocument()
    })
})
