import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UserDashboardPage } from './UserDashboardPage'

// Regression guard for a bug where this page read from data/mockData's fake
// services instead of the real service list — using a deliberately
// un-mock-data-like id/name here means the test only passes if the tiles
// are actually sourced from useServices()/useQueueLengths().
const queueFlowMock = vi.hoisted(() => ({ value: { activeQueue: null as unknown, notifications: [] as unknown[] } }))

vi.mock('../../api', () => ({
    useUser: () => ({ data: { name: 'Jamie Lee', email: 'jamie@example.com', role: 'user' } }),
    useServices: () => ({
        data: [{
            id: 'real-backend-id-1',
            name: 'Real Backend Service',
            description: '',
            expectedDurationMinutes: 30,
            priority: 'medium',
            status: 'open',
            estimatedWait: '30 min',
            tablePreferenceLabel: 'Any available table',
        }],
    }),
    useQueueLengths: () => ({ data: { 'real-backend-id-1': 4 } }),
}))

vi.mock('../queue-flow/useQueueFlow', () => ({
    useQueueFlow: () => queueFlowMock.value,
}))

function renderPage() {
    const rootRoute = createRootRoute()
    const testRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: UserDashboardPage })
    const router = createRouter({ routeTree: rootRoute.addChildren([testRoute]) })
    render(<RouterProvider router={router} />)
}

describe('UserDashboardPage', () => {
    it('greets the user by their real name and lists real services, not mock data', async () => {
        queueFlowMock.value = { activeQueue: null, notifications: [] }
        renderPage()

        expect(await screen.findByText(/welcome back, jamie lee/i)).toBeInTheDocument()
        expect(screen.getByText('Real Backend Service')).toBeInTheDocument()
        expect(screen.getByText('4 parties waiting')).toBeInTheDocument()
    })

    it('shows the empty state when the user has no active queue', async () => {
        queueFlowMock.value = { activeQueue: null, notifications: [] }
        renderPage()

        expect(await screen.findByText(/not currently in line/i)).toBeInTheDocument()
    })

    it('shows the active queue panel and unread notification badge', async () => {
        queueFlowMock.value = {
            activeQueue: { serviceName: 'Real Backend Service', position: 2, estimatedWait: '10 min' },
            notifications: [
                { id: 'n-1', title: 'Almost ready', message: 'Your table is almost ready.', createdAt: 'now', read: false, tone: 'info' },
                { id: 'n-2', title: 'Joined queue', message: 'You joined the queue.', createdAt: 'earlier', read: true, tone: 'info' },
            ],
        }
        renderPage()

        expect(await screen.findByRole('heading', { name: 'Real Backend Service', level: 2 })).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByLabelText('1 unread notifications')).toBeInTheDocument()
    })
})
