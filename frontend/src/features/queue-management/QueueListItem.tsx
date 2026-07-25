import type { QueueEntryView } from '../../api'
import { StatusBadge } from '../../ui/StatusBadge'

type Props = { position: number; queueEntry: QueueEntryView }

const STATUS_LABEL: Record<QueueEntryView['status'], string> = {
    waiting: 'Waiting',
    'almost-ready': 'Almost ready',
    served: 'Served',
    left: 'Left',
}

export function QueueListItem({ position, queueEntry }: Props) {
    return <li className="queue-row">
        <span className="queue-row__position">{position}</span>
        <span><strong>{queueEntry.userId}</strong></span>
        <span>{queueEntry.partySize}</span>
        <span><StatusBadge kind="priority" value={queueEntry.priority} /></span>
        <span>{new Date(queueEntry.joinedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        <span>{STATUS_LABEL[queueEntry.status]}</span>
    </li>
}
