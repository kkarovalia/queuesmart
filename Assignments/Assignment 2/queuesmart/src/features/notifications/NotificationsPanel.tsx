import { Bell, CheckCheck } from 'lucide-react'
import type { QueueNotification } from '../../types/queue'
import '../queue-flow/queue-flow.css'

type Props = { notifications: QueueNotification[]; onMarkAllRead: () => void }

export function NotificationsPanel({ notifications, onMarkAllRead }: Props) {
    const unreadCount = notifications.filter(notification => !notification.read).length
    return <section className="queue-page page" aria-labelledby="notifications-heading">
        <header className="page-header"><div><h1 id="notifications-heading">Notifications</h1><p>Queue updates, status changes, and reservation confirmations.</p></div><button className="secondary-button" type="button" onClick={onMarkAllRead} disabled={unreadCount === 0}><CheckCheck size={17} />Mark all read</button></header>
        <div className="queue-notifications-toolbar panel"><span>{unreadCount} unread</span><span>{notifications.length} total updates</span></div>
        {notifications.length === 0 ? <div className="queue-empty-state panel"><Bell size={32} /><h2>No notifications yet</h2><p>Queue and reservation updates will appear here.</p></div> : <div className="queue-notification-list">{notifications.map(notification => <article className={`queue-notification ${notification.tone} ${notification.read ? 'is-read' : 'is-unread'}`} key={notification.id}><Bell size={18} /><div><h2>{notification.title}</h2><p>{notification.message}</p></div><span>{notification.createdAt}</span></article>)}</div>}
        {unreadCount === 0 && notifications.length > 0 ? <p className="queue-read-confirmation" role="status">All notifications read.</p> : null}
    </section>
}
