import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { JoinQueueScreen } from '../join-queue/JoinQueueScreen'
import { NotificationsPanel } from '../notifications/NotificationsPanel'
import { QueueStatusScreen } from '../queue-status/QueueStatusScreen'
import { QueueFlowProvider } from './QueueFlowProvider'
import { useQueueFlow } from './useQueueFlow'
import { restaurantServices } from '../../data/mockQueueData'

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
                    services={restaurantServices}
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
    <QueueFlowProvider>
        <QueueFlowHarness />
    </QueueFlowProvider>,
)

const joinDinnerWaitlist = async () => {
    const user = userEvent.setup()
    renderFlow()
    await user.selectOptions(screen.getByLabelText(/select service/i), 'dinner-waitlist')
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))
    return user
}

describe('Kashf user queue flow', () => {
    it('renders all restaurant services and queue estimates', () => {
        renderFlow()

        expect(screen.getByRole('option', { name: 'Dinner Waitlist' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Bar Seating' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Patio Seating' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Private Dining' })).toBeInTheDocument()
        expect(screen.getByText(/current queue length/i)).toBeInTheDocument()
        expect(screen.getByText(/estimated wait/i)).toBeInTheDocument()
    })

    it('joins a queue and shows the next queue position', async () => {
        const user = await joinDinnerWaitlist()

        expect(screen.getByText(/you joined dinner waitlist/i)).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: /queue status/i }))

        expect(screen.getByRole('heading', { name: /dinner waitlist status/i })).toBeInTheDocument()
        expect(screen.getByText(/position 13/i)).toBeInTheDocument()
        expect(screen.getByRole('status', { name: /waiting/i })).toBeInTheDocument()
    })

    it('leaves the queue and clears the active queue status', async () => {
        const user = await joinDinnerWaitlist()

        await user.click(screen.getByRole('button', { name: /leave queue/i }))
        await user.click(screen.getByRole('button', { name: /queue status/i }))

        expect(screen.getByRole('heading', { name: /no active waitlist/i })).toBeInTheDocument()
    })

    it('advances waiting to almost ready and then served', async () => {
        const user = await joinDinnerWaitlist()

        await user.click(screen.getByRole('button', { name: /queue status/i }))
        await user.click(screen.getByRole('button', { name: /advance status/i }))
        expect(screen.getByRole('status', { name: /almost ready/i })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /advance status/i }))
        expect(screen.getByRole('status', { name: /served/i })).toBeInTheDocument()
        expect(screen.getByText(/your table is ready/i)).toBeInTheDocument()
    })

    it('renders notifications and marks them read', async () => {
        const user = await joinDinnerWaitlist()

        await user.click(screen.getByRole('button', { name: /notifications/i }))
        expect(screen.getByText(/you joined the waitlist/i)).toBeInTheDocument()
        expect(screen.getByText(/unread notifications: 1/i)).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /mark all read/i }))
        expect(screen.getByText(/unread notifications: 0/i)).toBeInTheDocument()
        expect(screen.getByText(/all notifications read/i)).toBeInTheDocument()
    })
})
