import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueueFlowProvider } from '../queue-flow/QueueFlowProvider'
import { JoinQueuePage } from './JoinQueuePage'

// Regression test for a bug where this page rendered options from
// data/mockData's fake services (ids like 'svc-1') while QueueFlowProvider's
// joinQueue looked the selected id up in the real useServices() list — a
// mismatch that made "Join Waitlist" silently do nothing, since the lookup
// always failed. Using a deliberately un-mock-data-like id here means the
// test only passes if the page's dropdown is actually sourced from
// useServices(), the same list joinQueue checks against.
const REAL_SERVICE_ID = 'real-backend-service-id'

const apiMocks = vi.hoisted(() => ({
    joinQueue: vi.fn(),
}))

vi.mock('../../api', () => ({
    useUser: () => ({ data: { name: 'Jamie', email: 'jamie@example.com', role: 'user' } }),
    useServices: () => ({
        isLoading: false,
        isError: false,
        data: [{
            id: REAL_SERVICE_ID,
            name: 'Dinner Waitlist',
            description: '',
            expectedDurationMinutes: 45,
            priority: 'high',
            status: 'open',
            estimatedWait: '45 min',
            tablePreferenceLabel: 'Any available table',
            queueLength: 3,
            userInQueue: false,
        }],
    }),
    useNotifications: () => ({ data: [] }),
    useMarkNotificationRead: () => ({ mutate: vi.fn() }),
    joinQueue: apiMocks.joinQueue,
    leaveQueue: vi.fn(),
    fetchEntryWaitStatus: vi.fn().mockResolvedValue(null),
}))

describe('JoinQueuePage', () => {
    it('joins using the real service list from useServices(), not mock data', async () => {
        apiMocks.joinQueue.mockResolvedValue({
            id: 'entry-1',
            serviceId: REAL_SERVICE_ID,
            userId: 'user-1',
            partySize: 4,
            priority: 'high',
            status: 'almost-ready',
            joinedAt: new Date().toISOString(),
            servedAt: null,
            position: 1,
        })
        const user = userEvent.setup()

        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <QueueFlowProvider><JoinQueuePage /></QueueFlowProvider>
            </QueryClientProvider>,
        )

        expect(screen.getByRole('option', { name: 'Dinner Waitlist' })).toBeInTheDocument()
        expect(screen.getByText(/parties ahead/i).closest('div')).toHaveTextContent('3')
        await user.click(screen.getByRole('button', { name: /join waitlist/i }))

        expect(apiMocks.joinQueue).toHaveBeenCalledWith({ serviceId: REAL_SERVICE_ID, partySize: 4 })
        expect(await screen.findByText(/you're on the dinner waitlist/i)).toBeInTheDocument()
    })
})
