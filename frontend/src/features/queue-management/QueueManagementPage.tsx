import { Link } from '@tanstack/react-router'
import { BellRing, ListTree, UserX } from 'lucide-react'
import { useMarkNoShow, useQueue, useServeNextInQueue, useService } from '../../api'
import { QueueListItem } from './QueueListItem'
import './queue-management.css'

export function QueueManagementPage({ serviceId }: { serviceId: string }) {
    const service = useService(serviceId)
    const queueEntries = useQueue(serviceId)
    const serveNext = useServeNextInQueue(serviceId)
    const markNoShow = useMarkNoShow(serviceId)
    const entries = queueEntries.data ?? []

    if (service.isLoading || queueEntries.isLoading) return <p>Loading queue...</p>
    return <section className="queue-management page">
        <header className="page-header">
            <div><h1>{service.data?.name ?? 'Queue Management'}</h1><p>{entries.length} parties currently waiting, ordered by priority then arrival time.</p></div>
            <div className="queue-management__header-actions">
                <Link to="/admin/queue" className="secondary-button"><ListTree size={17} />Switch queue</Link>
                <button className="secondary-button" type="button" onClick={() => markNoShow.mutate()} disabled={entries.length === 0 || markNoShow.isPending}>
                    <UserX size={17} />Mark no-show
                </button>
                <button className="primary-button" type="button" onClick={() => serveNext.mutate()} disabled={entries.length === 0 || serveNext.isPending}>
                    <BellRing size={17} />Serve next
                </button>
            </div>
        </header>

        {serveNext.isError ? <p role="alert">Failed to serve the next guest. Please try again.</p> : null}
        {markNoShow.isError ? <p role="alert">Failed to mark the next guest as a no-show. Please try again.</p> : null}

        <div className="queue-management__table panel">
            <div className="queue-row queue-row--head"><span>#</span><span>Guest</span><span>Party</span><span>Priority</span><span>Joined</span><span>Status</span></div>
            {entries.length === 0 ? <div className="empty-state">No guests are waiting.</div> : <ol>{entries.map((entry, index) => <QueueListItem key={entry.id} position={index + 1} queueEntry={entry} />)}</ol>}
        </div>
    </section>
}
