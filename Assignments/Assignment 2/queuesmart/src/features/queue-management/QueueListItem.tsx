import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import type { QueueEntry } from '../../contracts/types'

type Props = { position: number; queueEntry: QueueEntry & { isPending?: boolean }; onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void; canMoveUp: boolean; canMoveDown: boolean }

export function QueueListItem({ position, queueEntry, onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown }: Props) {
    return <li className="queue-row"><span className="queue-row__position">{position}</span><span><strong>{queueEntry.customerName}</strong>{queueEntry.isPending ? <small>Unsaved</small> : null}</span><span>{queueEntry.partySize}</span><span>{queueEntry.estimatedWaitMinutes} min</span><span>{queueEntry.isPending ? 'Now' : new Date(queueEntry.joinedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span><span className="queue-row__actions"><button className="icon-button" type="button" onClick={onMoveUp} disabled={!canMoveUp} aria-label={`Move ${queueEntry.customerName} up`} title="Move up"><ArrowUp size={15} /></button><button className="icon-button" type="button" onClick={onMoveDown} disabled={!canMoveDown} aria-label={`Move ${queueEntry.customerName} down`} title="Move down"><ArrowDown size={15} /></button><button className="icon-button queue-row__remove" type="button" onClick={onRemove} aria-label={`Remove ${queueEntry.customerName}`} title="Remove guest"><Trash2 size={15} /></button></span></li>
}
