import type { ActiveQueueEntry, QueueStatus } from '../../types/queue'
import '../queue-flow/queue-flow.css'

type QueueStatusScreenProps = {
    activeQueue: ActiveQueueEntry | null
    onAdvanceStatus: () => void
    onLeaveQueue: () => void
}

const statusDetails: Record<QueueStatus, { label: string; description: string }> = {
    waiting: {
        label: 'Waiting',
        description: 'You are checked in. The restaurant is tracking table turnover and party size.',
    },
    'almost-ready': {
        label: 'Almost ready',
        description: 'Your table is being prepared. Please stay nearby for seating.',
    },
    served: {
        label: 'Served',
        description: 'Your table is ready. Please check in with the host stand.',
    },
}

export function QueueStatusScreen({
    activeQueue,
    onAdvanceStatus,
    onLeaveQueue,
}: QueueStatusScreenProps) {
    if (!activeQueue) {
        return (
            <section className="queue-empty-state" aria-labelledby="empty-status-heading">
                <h1 id="empty-status-heading">No active waitlist</h1>
                <p>Join a restaurant waitlist to see your position and wait-time estimate here.</p>
            </section>
        )
    }

    const details = statusDetails[activeQueue.status]
    const timelineStep = activeQueue.status === 'waiting' ? 1 : activeQueue.status === 'almost-ready' ? 2 : 3

    return (
        <section className="queue-page queue-page--status" aria-labelledby="queue-status-heading">
            <div className="queue-page__heading">
                <p className="queue-page__eyebrow">Live queue status</p>
                <h1 id="queue-status-heading">{activeQueue.serviceName} Status</h1>
                <p>{details.description}</p>
            </div>

            <div className="queue-card queue-status-card">
                <div className="queue-status-topline">
                    <span
                        className={`queue-status-pill ${activeQueue.status}`}
                        role="status"
                        aria-label={`Queue status: ${details.label}`}
                    >
                        {details.label}
                    </span>
                    <span>Joined at {activeQueue.joinedAt}</span>
                </div>

                <div className="queue-status-metrics">
                    <div>
                        <span>Current position</span>
                        <strong>{activeQueue.status === 'served' ? 'Seated' : `Position ${activeQueue.position}`}</strong>
                    </div>
                    <div>
                        <span>Estimated wait</span>
                        <strong>{activeQueue.estimatedWait}</strong>
                    </div>
                    <div>
                        <span>Party size</span>
                        <strong>{activeQueue.partySize}</strong>
                    </div>
                </div>

                <div className="queue-timeline" aria-label={`Queue progress step ${timelineStep} of 3`}>
                    {[1, 2, 3].map((step) => (
                        <div className="queue-timeline-step" key={step}>
                            <span className={step <= timelineStep ? 'queue-timeline-dot is-complete' : 'queue-timeline-dot'} />
                            <span>{step === 1 ? 'Waiting' : step === 2 ? 'Almost ready' : 'Served'}</span>
                        </div>
                    ))}
                </div>

                <div className="queue-action-row">
                    {activeQueue.status !== 'served' ? (
                        <button className="queue-primary-button" type="button" onClick={onAdvanceStatus}>
                            Advance Status
                        </button>
                    ) : (
                        <span className="queue-served-confirmation">Seating completed</span>
                    )}
                    <button className="queue-secondary-button queue-danger-button" type="button" onClick={onLeaveQueue}>
                        Leave Queue
                    </button>
                </div>
            </div>

            <aside className="queue-card queue-preference-card">
                <h2>Reservation preferences</h2>
                <p>
                    {activeQueue.tablePreference} on {activeQueue.preferredDate} at {activeQueue.preferredTime}.
                </p>
            </aside>
        </section>
    )
}
