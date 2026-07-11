import { Link } from '@tanstack/react-router'
import { useServices, useMyQueueStatus, useNotifications } from '../../api'
import { StatusBadge } from '../../ui/StatusBadge'
import './user-dashboard.css'

export function UserDashboardPage() {
    const servicesQuery = useServices()
    const myQueueQuery = useMyQueueStatus()
    const notificationsQuery = useNotifications()

    if (servicesQuery.isLoading) {
        return <p>Loading dashboard...</p>
    }

    const services = servicesQuery.data ?? []
    const myQueue = myQueueQuery.data ?? null
    const myService = services.find((s) => s.id === myQueue?.serviceId)
    const notifications = notificationsQuery.data ?? []
    const unreadCount = notifications.filter((n) => !n.read).length

    return (
        <div className="user-dashboard">
            <h1>Good evening!</h1>

            <div className="user-dashboard__card">
                <h2>Your current queue</h2>
                {myQueue && myService ? (
                    <div className="user-dashboard__queue-row">
                        <div>
                            <div className="user-dashboard__queue-name">{myService.name}</div>
                            <div className="user-dashboard__queue-meta">
                                Position {myQueue.position} &middot; Party of {myQueue.partySize}
                            </div>
                        </div>
                        <div className="user-dashboard__queue-wait">
                            <span className="user-dashboard__wait-pill">~{myQueue.estimatedWaitMinutes} min wait</span>
                            <div>
                                <Link to="/queue-status">View status &rarr;</Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="user-dashboard__empty">You're not in a queue right now.</p>
                )}
            </div>

            <div className="user-dashboard__card">
                <h2>Available services</h2>
                <table className="user-dashboard__table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((service) => (
                            <tr key={service.id}>
                                <td>{service.name}</td>
                                <td><StatusBadge kind="status" value={service.status} /></td>
                                <td><Link to="/join-queue">Join</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="user-dashboard__card">
                <div className="user-dashboard__notif-header">
                    <h2>Notifications</h2>
                    {unreadCount > 0 && <span className="user-dashboard__unread-pill">{unreadCount} new</span>}
                </div>
                <ul className="user-dashboard__notif-list">
                    {notifications.slice(0, 3).map((note) => (
                        <li key={note.id}>
                            <strong>{note.title}</strong> - {note.body}
                        </li>
                    ))}
                </ul>
                <Link to="/notifications">View all notifications &rarr;</Link>
            </div>
        </div>
    )
}
