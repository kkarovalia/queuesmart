import { afterEach, describe, expect, it } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { JoinQueueScreen } from '../join-queue/JoinQueueScreen'
import { NotificationsPanel } from '../notifications/NotificationsPanel'
import { QueueStatusScreen } from '../queue-status/QueueStatusScreen'
import { QueueFlowProvider } from './QueueFlowProvider'
import { useQueueFlow } from './useQueueFlow'
import { mockServices, mockQueueEntries } from '../../data/mockData'

const queueLengths = mockQueueEntries.reduce<Record<string, number>>((lengths, entry) => {
    lengths[entry.serviceId] = (lengths[entry.serviceId] ?? 0) + 1
    return lengths
}, {})

function QueueFlowHarness() {
    const [screenName, setScreenName] = useState<'join' | 'status' | 'notifications'>('join')
    const { activeQueue, notifications, joinQueue, leaveQueue, advanceStatus, markAllRead } = useQueueFlow()

    return (
        <>
            <nav>
                <button type="button" onClick={() => setScreenName('join')}>Join Queue</button>
                <button type="button" onClick={() => setScreenName('status')}>Queue Status</button>
                <button type="button" onClick={() => setScreenName('notifications')}>Notifications</button>
            </nav>
            {screenName === 'join' ? (
                <JoinQueueScreen
                    services={mockServices}
                    queueLengths={queueLengths}
                    activeQueue={activeQueue}
                    onJoinQueue={joinQueue}
                    onLeaveQueue={leaveQueue}
                />
            ) : null}
            {screenName === 'status' ? (
                <QueueStatusScreen
                    activeQueue={activeQueue}
                    onAdvanceStatus={advanceStatus}
                    onLeaveQueue={leaveQueue}
                />
            ) : null}
            {screenName === 'notifications' ? (
                <NotificationsPanel notifications={notifications} onMarkAllRead={markAllRead} />
            ) : null}
        </>
    )
}

const renderFlow = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <QueueFlowProvider>
            <QueueFlowHarness />
        </QueueFlowProvider>
    </QueryClientProvider>,
)

// This suite drives the real backend (see backend/src/modules/queue and
// notifications), the same way AdminDashboard.test.tsx and
// QueueManagement.test.tsx do, rather than a local mock simulation. Always
// leave user '123' out of svc-1's real queue after each test so joins in
// later tests don't 409 against state a previous test left behind.
afterEach(async () => {
    await fetch('http://localhost:3001/api/queue/svc-1/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: '123' }),
    }).catch(() => {})
})

const joinDinnerWaitlist = async () => {
    const user = userEvent.setup()
    renderFlow()
    await user.selectOptions(screen.getByLabelText(/select service/i), 'svc-1')
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))
    // The real join + wait-time lookup both resolve before this banner
    // renders, so once it's visible, position/status are already settled.
    await screen.findByText(/you're on the dinner waitlist/i, {}, { timeout: 3000 })
    return user
}

describe('Kashf user queue flow', () => {
    it('renders all restaurant services and queue estimates', () => {
        renderFlow()

        expect(screen.getByRole('option', { name: 'Dinner Waitlist' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Bar Seating' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Patio Seating' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Private Dining - Closed' })).toBeInTheDocument()
        expect(screen.getByText(/parties ahead/i)).toBeInTheDocument()
        expect(screen.getByText(/current wait/i)).toBeInTheDocument()
    })

    it('joins the real queue and shows the next queue position', async () => {
        // Derived from actual current state, not assumed: an earlier test in
        // this file (or an earlier run against this same live server) may
        // have already served the seeded guests ahead, which would otherwise
        // make this assume 'waiting' when joining an empty line is really
        // 'almost-ready' instead.
        const queueBefore: unknown[] = await fetch('http://localhost:3001/api/queue/svc-1').then(r => r.json())
        const expectedPosition = queueBefore.length + 1
        const expectedStatus = expectedPosition === 1 ? /almost ready/i : /waiting/i

        const user = await joinDinnerWaitlist()
        await user.click(screen.getByRole('button', { name: /queue status/i }))

        expect(screen.getByRole('heading', { name: /dinner waitlist/i })).toBeInTheDocument()
        expect(screen.getByText(String(expectedPosition))).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent(expectedStatus)
    })

    it('leaves the queue and clears the active queue status', async () => {
        const user = await joinDinnerWaitlist()

        await user.click(screen.getByRole('button', { name: /leave current queue/i }))
        await user.click(screen.getByRole('button', { name: /queue status/i }))

        expect(await screen.findByRole('heading', { name: /no active waitlist/i })).toBeInTheDocument()
    })

    it('reflects almost-ready once the admin actually serves the people ahead', async () => {
        const user = await joinDinnerWaitlist()
        await user.click(screen.getByRole('button', { name: /queue status/i }))

        // Clear whoever's ahead via the real serve-next action (the same
        // endpoint the admin Queue Management screen uses), so "refresh"
        // reflects an actual backend change rather than a local simulation.
        let waiting: unknown[] = await fetch('http://localhost:3001/api/queue/svc-1').then(r => r.json())
        while (waiting.length > 1) {
            await fetch('http://localhost:3001/api/queue/svc-1/serve-next', { method: 'POST' })
            waiting = await fetch('http://localhost:3001/api/queue/svc-1').then(r => r.json())
        }

        await user.click(screen.getByRole('button', { name: /refresh status/i }))
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/almost ready/i))

        await fetch('http://localhost:3001/api/queue/svc-1/serve-next', { method: 'POST' })

        await user.click(screen.getByRole('button', { name: /refresh status/i }))
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/table ready/i))
        expect(screen.getByText(/please check in with the host stand/i)).toBeInTheDocument()
    })

    it('renders notifications and marks them read', async () => {
        const user = await joinDinnerWaitlist()

        await user.click(screen.getByRole('button', { name: /notifications/i }))
        // Earlier tests in this file also joined/left, so more than one of
        // these may be present — just confirm at least one shows up.
        expect((await screen.findAllByText(/you joined the waitlist/i)).length).toBeGreaterThan(0)
        expect(screen.getByText(/[1-9]\d* unread/i)).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /mark all read/i }))
        await waitFor(() => expect(screen.getByText(/0 unread/i)).toBeInTheDocument())
        expect(screen.getByText(/all notifications read/i)).toBeInTheDocument()
    })
})
