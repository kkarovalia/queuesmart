import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const apiMocks = vi.hoisted(() => ({
    activeQueue: null as null | {
        id: string
        serviceId: string
        userId: string
        userName: string
        userEmail: string
        partySize: number
        priority: 'low' | 'medium' | 'high'
        status: 'waiting' | 'almost-ready' | 'served' | 'left'
        joinedAt: string
        servedAt: string | null
        position?: number
    },
    joinQueue: vi.fn(),
    leaveQueue: vi.fn(),
    fetchEntryWaitStatus: vi.fn(),
    markRead: vi.fn(),
    services: [
        { id: 'svc-1', name: 'Dinner Waitlist', description: '', expectedDurationMinutes: 45, priority: 'high', status: 'open', estimatedWait: '45 min', tablePreferenceLabel: 'Any available table' },
        { id: 'svc-2', name: 'Bar Seating', description: '', expectedDurationMinutes: 30, priority: 'medium', status: 'open', estimatedWait: '30 min', tablePreferenceLabel: 'Any available table' },
        { id: 'svc-3', name: 'Patio Seating', description: '', expectedDurationMinutes: 40, priority: 'medium', status: 'open', estimatedWait: '40 min', tablePreferenceLabel: 'Any available table' },
        { id: 'svc-4', name: 'Private Dining', description: '', expectedDurationMinutes: 120, priority: 'high', status: 'closed', estimatedWait: '120 min', tablePreferenceLabel: 'Any available table' },
    ],
}))

vi.mock('../../api', () => ({
    ACTIVE_QUEUE_QUERY_KEY: ['activeQueue'],
    useUser: () => ({ data: { id: 'mongo-user-id', email: 'jamie@example.com', role: 'user' } }),
    useServices: () => ({ data: apiMocks.services }),
    useActiveQueue: () => ({ data: apiMocks.activeQueue, isLoading: false }),
    useNotifications: () => ({
        data: [{
            id: 'notification-1',
            title: 'You joined the waitlist',
            message: 'You joined the queue for Dinner Waitlist.',
            createdAt: 'Now',
            read: false,
            tone: 'success',
        }],
    }),
    useMarkNotificationRead: () => ({ mutate: apiMocks.markRead }),
    joinQueue: apiMocks.joinQueue,
    leaveQueue: apiMocks.leaveQueue,
    fetchEntryWaitStatus: apiMocks.fetchEntryWaitStatus,
}))

const queueLengths = mockQueueEntries.reduce<Record<string, number>>((lengths, entry) => {
    lengths[entry.serviceId] = (lengths[entry.serviceId] ?? 0) + 1
    return lengths
}, {})

function QueueFlowHarness() {
    const [screenName, setScreenName] = useState<'join' | 'status' | 'notifications'>('join')
    const { activeQueue, joinError, isJoining, notifications, joinQueue, leaveQueue, advanceStatus, markAllRead } = useQueueFlow()

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
                    joinError={joinError}
                    isJoining={isJoining}
                    onJoinQueue={joinQueue}
                    onLeaveQueue={leaveQueue}
                />
            ) : null}
            {screenName === 'status' ? (
                <QueueStatusScreen activeQueue={activeQueue} onAdvanceStatus={advanceStatus} onLeaveQueue={leaveQueue} />
            ) : null}
            {screenName === 'notifications' ? (
                <NotificationsPanel notifications={notifications} onMarkAllRead={markAllRead} />
            ) : null}
        </>
    )
}

function renderFlow() {
    return render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <QueueFlowProvider><QueueFlowHarness /></QueueFlowProvider>
        </QueryClientProvider>,
    )
}

async function joinDinnerWaitlist() {
    const user = userEvent.setup()
    renderFlow()
    await user.selectOptions(screen.getByLabelText(/select service/i), 'svc-1')
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))
    await screen.findByText(/you're on the dinner waitlist/i)
    return user
}

beforeEach(() => {
    apiMocks.activeQueue = null
    apiMocks.joinQueue.mockReset().mockResolvedValue({
        id: 'queue-entry-id',
        serviceId: 'svc-1',
        userId: 'mongo-user-id',
        partySize: 4,
        priority: 'high',
        status: 'almost-ready',
        joinedAt: new Date().toISOString(),
        servedAt: null,
        position: 1,
    })
    apiMocks.leaveQueue.mockReset().mockResolvedValue(undefined)
    apiMocks.fetchEntryWaitStatus.mockReset().mockResolvedValue({
        entryId: 'queue-entry-id',
        serviceId: 'svc-1',
        position: 1,
        estimatedWaitMinutes: 0,
    })
    apiMocks.markRead.mockReset()
})

describe('Kashf user queue flow', () => {
    it('renders the restaurant queue options', () => {
        renderFlow()
        expect(screen.getByRole('option', { name: 'Dinner Waitlist' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Private Dining - Closed' })).toBeInTheDocument()
    })

    it('joins using the authenticated API contract without a userId body field', async () => {
        const user = await joinDinnerWaitlist()
        await user.click(screen.getByRole('button', { name: /queue status/i }))

        expect(apiMocks.joinQueue).toHaveBeenCalledWith({ serviceId: 'svc-1', partySize: 4 })
        expect(screen.getByRole('status')).toHaveTextContent(/almost ready/i)
        expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('rehydrates an active queue entry returned by the backend', async () => {
        apiMocks.activeQueue = {
            id: 'persisted-entry-id',
            serviceId: 'svc-3',
            userId: 'mongo-user-id',
            userName: 'Jamie Lee',
            userEmail: 'jamie@example.com',
            partySize: 3,
            priority: 'medium',
            status: 'waiting',
            joinedAt: '2026-08-14T23:00:00.000Z',
            servedAt: null,
            position: 2,
        }
        apiMocks.fetchEntryWaitStatus.mockResolvedValueOnce({
            entryId: 'persisted-entry-id',
            serviceId: 'svc-3',
            position: 2,
            estimatedWaitMinutes: 40,
        })

        const user = userEvent.setup()
        renderFlow()
        await user.click(screen.getByRole('button', { name: /queue status/i }))

        expect(await screen.findByRole('heading', { name: 'Patio Seating' })).toBeInTheDocument()
        expect(screen.getByText('40 min')).toBeInTheDocument()
        expect(apiMocks.fetchEntryWaitStatus).toHaveBeenCalledWith('svc-3', 'persisted-entry-id')
    })

    it('shows the backend message when joining is rejected', async () => {
        apiMocks.joinQueue.mockRejectedValueOnce(new Error('You are already in the queue for this service'))
        const user = userEvent.setup()
        renderFlow()

        await user.selectOptions(screen.getByLabelText(/select service/i), 'svc-3')
        await user.click(screen.getByRole('button', { name: /join waitlist/i }))

        expect(await screen.findByRole('alert')).toHaveTextContent('You are already in the queue for this service')
        expect(screen.getByRole('button', { name: /join waitlist/i })).toBeEnabled()
    })

    it('leaves through the authenticated API contract and clears local status', async () => {
        const user = await joinDinnerWaitlist()
        await user.click(screen.getByRole('button', { name: /leave current queue/i }))
        await user.click(screen.getByRole('button', { name: /queue status/i }))

        expect(apiMocks.leaveQueue).toHaveBeenCalledWith({ serviceId: 'svc-1' })
        expect(await screen.findByRole('heading', { name: /no active waitlist/i })).toBeInTheDocument()
    })

    it('loads notifications for the authenticated user and marks unread items', async () => {
        const user = userEvent.setup()
        renderFlow()
        await user.click(screen.getByRole('button', { name: /notifications/i }))
        await user.click(screen.getByRole('button', { name: /mark all read/i }))

        await waitFor(() => expect(apiMocks.markRead).toHaveBeenCalledWith('notification-1'))
    })
})
