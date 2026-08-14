import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminReportsPage } from './AdminReportsPage'

// Backend: backend/src/modules/reports/router.ts (branch final-reports).
// Three real endpoints, GET /api/reports/users|services|summary, JSON by
// default, CSV when ?format=csv is set. Stubbing fetch here per URL to
// match that shape exactly, not guessing at it.

const mockParticipation = [
    { userId: 'u-1', userName: 'Jamie Lee', userEmail: 'jamie@example.com', serviceId: 'svc-1', serviceName: 'Dinner Waitlist', partySize: 4, joinedAt: '2026-08-01T20:00:00Z', resolvedAt: '2026-08-01T20:42:00Z', outcome: 'seated', waitMinutes: 42 },
]

const mockServiceActivity = [
    { serviceId: 'svc-1', serviceName: 'Dinner Waitlist', status: 'open', priority: 'high', totalEntries: 5, seatedCount: 4, cancelledCount: 1, noShowCount: 0, averageWaitMinutes: 40 },
]

const mockSummary = {
    totalServed: 4,
    totalCancelled: 1,
    totalNoShow: 0,
    averageWaitMinutes: 40,
    busiestService: { serviceName: 'Dinner Waitlist', totalEntries: 5 },
    rangeFrom: null,
    rangeTo: null,
}

function stubFetch(overrides?: { status?: number; body?: object }) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (overrides) {
            return new Response(JSON.stringify(overrides.body ?? {}), { status: overrides.status ?? 200 })
        }
        if (url.includes('/api/reports/users')) {
            return new Response(JSON.stringify(mockParticipation), { status: 200 })
        }
        if (url.includes('/api/reports/services')) {
            return new Response(JSON.stringify(mockServiceActivity), { status: 200 })
        }
        if (url.includes('/api/reports/summary')) {
            return new Response(JSON.stringify(mockSummary), { status: 200 })
        }
        return new Response('not found', { status: 404 })
    }))
}

function renderPage() {
    render(<QueryClientProvider client={new QueryClient()}><AdminReportsPage /></QueryClientProvider>)
}

describe('admin reports', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('generates all three reports and shows the summary numbers', async () => {
        stubFetch()
        renderPage()
        const user = userEvent.setup()

        await user.click(screen.getByRole('button', { name: /generate report/i }))

        expect(await screen.findByText('Total served', {}, { timeout: 3000 })).toBeInTheDocument()
        expect(screen.getByText('4', { selector: '.admin-reports__summary-value' })).toBeInTheDocument()
        expect(screen.getByText('Dinner Waitlist', { selector: '.admin-reports__summary-value--text' })).toBeInTheDocument()
    })

    it('shows the service activity table', async () => {
        stubFetch()
        renderPage()
        const user = userEvent.setup()

        await user.click(screen.getByRole('button', { name: /generate report/i }))

        const heading = await screen.findByText('Service activity', {}, { timeout: 3000 })
        const section = heading.closest('.panel') as HTMLElement
        expect(within(section).getByRole('cell', { name: 'Dinner Waitlist' })).toBeInTheDocument()
        expect(within(section).getByText('open')).toBeInTheDocument()
    })

    it('shows the participation history table', async () => {
        stubFetch()
        renderPage()
        const user = userEvent.setup()

        await user.click(screen.getByRole('button', { name: /generate report/i }))

        const heading = await screen.findByText('Participation history', {}, { timeout: 3000 })
        const section = heading.closest('.panel') as HTMLElement
        expect(within(section).getByText('jamie@example.com')).toBeInTheDocument()
    })

    it('shows the backend error message when the date filter is invalid', async () => {
        stubFetch({ status: 400, body: { error: 'from must be a valid date' } })
        renderPage()
        const user = userEvent.setup()

        await user.click(screen.getByRole('button', { name: /generate report/i }))

        expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('from must be a valid date')
    })

    it('shows an error when the user is not an admin', async () => {
        stubFetch({ status: 403, body: { error: 'Admin access required' } })
        renderPage()
        const user = userEvent.setup()

        await user.click(screen.getByRole('button', { name: /generate report/i }))

        expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Admin access required')
    })
})
