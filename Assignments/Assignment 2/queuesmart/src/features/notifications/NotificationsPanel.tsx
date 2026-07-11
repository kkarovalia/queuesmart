import type { QueueNotification } from '../../types/queue'
import '../queue-flow/queue-flow.css'

type NotificationsPanelProps = {
    notifications: QueueNotification[]
    onMarkAllRead: () => void
}

export function NotificationsPanel({ notifications, onMarkAllRead }: NotificationsPanelProps) {
    const unreadCount = notifications.filter((notification) => !notification.read).length

    return (
        <section className="queue-page queue-page--notifications" aria-labelledby="notifications-heading">
            <div className="queue-page__heading">
                <p className="queue-page__eyebrow">In-app notifications</p>
                <h1 id="notifications-heading">Queue Notifications</h1>
                <p>Restaurant updates for waitlist position and table readiness.</p>
            </div>

            <div className="queue-card queue-notifications-toolbar">
                <span>Unread notifications: {unreadCount}</span>
                <button className="queue-secondary-button" type="button" onClick={onMarkAllRead} disabled={unreadCount === 0}>
                    Mark all read
                </button>
            </div>

            {notifications.length === 0 ? (
                <div className="queue-empty-state queue-empty-state--inside-card">
                    <h2>No notifications yet</h2>
                    <p>Join a queue to generate QueueSmart updates.</p>
                </div>
            ) : (
                <div className="queue-notification-list">
                    {notifications.map((notification) => (
                        <article
                            className={`queue-notification ${notification.tone} ${notification.read ? 'is-read' : 'is-unread'}`}
                            key={notification.id}
                        >
                            <div>
                                <h2>{notification.title}</h2>
                                <p>{notification.message}</p>
                            </div>
                            <span>{notification.createdAt}</span>
                        </article>
                    ))}
                </div>
            )}

            {unreadCount === 0 && notifications.length > 0 ? (
                <p className="queue-read-confirmation">All notifications read.</p>
            ) : null}
        </section>
    )
}
