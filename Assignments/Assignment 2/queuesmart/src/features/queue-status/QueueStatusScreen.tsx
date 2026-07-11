import { Clock3, RefreshCw, UsersRound } from 'lucide-react'
import type { ActiveQueueEntry, QueueStatus } from '../../types/queue'
import '../queue-flow/queue-flow.css'

type Props = { activeQueue: ActiveQueueEntry | null; onAdvanceStatus: () => void; onLeaveQueue: () => void }
const details: Record<QueueStatus, { label: string; description: string }> = {
    waiting: { label: 'Waiting', description: "You're checked in and the host is tracking table availability." },
    'almost-ready': { label: 'Almost ready', description: 'Your table is being prepared. Please stay nearby.' },
    served: { label: 'Table ready', description: 'Please check in with the host stand for seating.' },
}

export function QueueStatusScreen({ activeQueue, onAdvanceStatus, onLeaveQueue }: Props) {
    if (!activeQueue) return <section className="queue-empty-state page"><UsersRound size={34} /><h1>No active waitlist</h1><p>Join a walk-in waitlist to see your live position here.</p><a href="/join-queue" className="primary-button">View open queues</a></section>

    const current = details[activeQueue.status]
    const step = activeQueue.status === 'waiting' ? 1 : activeQueue.status === 'almost-ready' ? 2 : 3
    return <section className="queue-page page" aria-labelledby="queue-status-heading">
        <header className="page-header"><div><h1 id="queue-status-heading">{activeQueue.serviceName}</h1><p>Bistro 42</p></div><button className="queue-leave-link" type="button" onClick={onLeaveQueue}>Leave queue</button></header>
        <div className="queue-card queue-status-card">
            <div className="queue-status-topline"><div><span className={`queue-status-pill ${activeQueue.status}`} role="status">{current.label}</span><h2>You're in line</h2><p>{current.description}</p></div><span>Joined {activeQueue.joinedAt}</span></div>
            <div className="queue-status-metrics"><div><UsersRound /><span>Current position<strong>{activeQueue.status === 'served' ? 'Ready' : activeQueue.position}</strong></span></div><div><Clock3 /><span>Estimated wait<strong>{activeQueue.estimatedWait}</strong></span></div></div>
            <ol className="queue-timeline" aria-label={`Queue progress step ${step} of 3`}>
                {['Joined waitlist', 'Almost ready', 'Table ready'].map((label, index) => <li className={index + 1 <= step ? 'is-complete' : ''} key={label}><span /><div><strong>{label}</strong><small>{index === 0 ? activeQueue.joinedAt : index + 1 === step ? 'Current update' : 'Pending'}</small></div></li>)}
            </ol>
            {activeQueue.status !== 'served' ? <button className="secondary-button queue-refresh" type="button" onClick={onAdvanceStatus}><RefreshCw size={17} />Refresh status</button> : null}
        </div>
        {activeQueue.status === 'almost-ready' ? <div className="queue-callout">We'll notify you when your table is ready. Please stay nearby.</div> : null}
    </section>
}
