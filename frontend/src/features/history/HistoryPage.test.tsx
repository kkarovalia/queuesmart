import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryPage } from './HistoryPage'

const mockHistoryResponse = [
    { id: 'h-1', serviceName: 'Dinner Waitlist', partySize: 4, resolvedAt: '2026-06-19T23:50:00Z', outcome: 'seated', waitMinutes: 40 },
    { id: 'h-2', serviceName: 'Bar Seating', partySize: 2, resolvedAt: '2026-06-02T20:00:00Z', outcome: 'cancelled', waitMinutes: 0 },
]

describe('history', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockHistoryResponse), { status: 200 })))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('renders history rows and filters outcomes', async () => {
        const user = userEvent.setup()
        render(<QueryClientProvider client={new QueryClient()}><HistoryPage /></QueryClientProvider>)
        expect(await screen.findByText('Dinner Waitlist', {}, { timeout: 3000 })).toBeInTheDocument()
        await user.selectOptions(screen.getByLabelText(/filter by outcome/i), 'cancelled')
        expect(screen.getByText('Bar Seating')).toBeInTheDocument()
        expect(screen.queryByText('Dinner Waitlist')).not.toBeInTheDocument()
    })
})
