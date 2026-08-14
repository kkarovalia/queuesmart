import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminHistoryPage } from './AdminHistoryPage'

const mockAllHistoryResponse = [
    { id: 'h-1', serviceName: 'Dinner Waitlist', partySize: 4, resolvedAt: '2026-06-19T23:50:00Z', outcome: 'seated', waitMinutes: 40, customerEmail: 'jamie@example.com' },
    { id: 'h-2', serviceName: 'Bar Seating', partySize: 2, resolvedAt: '2026-06-02T20:00:00Z', outcome: 'cancelled', waitMinutes: 0, customerEmail: 'jamie@example.com' },
]

describe('admin history', () => {
    beforeEach(() => {
        window.localStorage.setItem('queuesmart_token', 'admin-token')
        vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            expect(init?.headers).toMatchObject({ Authorization: 'Bearer admin-token' })
            return new Response(JSON.stringify(mockAllHistoryResponse), { status: 200 })
        }))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        window.localStorage.clear()
    })

    it('sends admin auth and renders every customer\'s history rows', async () => {
        render(<QueryClientProvider client={new QueryClient()}><AdminHistoryPage /></QueryClientProvider>)

        expect(await screen.findByText('Dinner Waitlist', {}, { timeout: 3000 })).toBeInTheDocument()
        expect(screen.getByText('Bar Seating')).toBeInTheDocument()
        expect(screen.getAllByText('jamie@example.com')).toHaveLength(2)
    })
})
