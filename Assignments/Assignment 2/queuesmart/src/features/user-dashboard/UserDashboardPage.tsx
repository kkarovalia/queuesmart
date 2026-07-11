import { Link } from '@tanstack/react-router'
import { Bell, CalendarDays, Clock3, UsersRound } from 'lucide-react'
import { useReservations, useTables } from '../../api'
import { mockServices, mockQueueEntries } from '../../data/mockData'
import { useQueueFlow } from '../queue-flow/useQueueFlow'
import './user-dashboard.css'

export function UserDashboardPage() {
    const { activeQueue, notifications } = useQueueFlow()
    const reservations = useReservations().data ?? []
    const tables = useTables().data ?? []
    const upcoming = reservations.find(item => item.customerName === 'Jamie Lee' && item.status === 'confirmed')
    const upcomingTable = tables.find(table => table.id === upcoming?.tableId)
    const unread = notifications.filter(note => !note.read)

    return <section className="user-dashboard page">
        <header className="page-header"><div><h1>Good evening, Jamie!</h1><p>Here's what's happening at Bistro 42.</p></div><Link to="/notifications" className="dashboard-bell" aria-label={`${unread.length} unread notifications`}><Bell size={19} />{unread.length > 0 ? <b>{unread.length}</b> : null}</Link></header>

        <div className="dashboard-overview">
            <article className="dashboard-focus-panel">
                <span className="dashboard-label">Current queue</span>
                {activeQueue ? <>
                    <h2>{activeQueue.serviceName}</h2>
                    <div className="dashboard-queue-stats"><div><strong>{activeQueue.position}</strong><span>parties ahead</span></div><div><strong>{activeQueue.estimatedWait}</strong><span>estimated wait</span></div></div>
                    <Link to="/queue-status" className="primary-button">View my queue</Link>
                </> : <div className="dashboard-empty"><UsersRound /><h2>Not currently in line</h2><p>Choose an open service when you're ready.</p><Link to="/join-queue" className="primary-button">View open queues</Link></div>}
            </article>

            <article className="dashboard-focus-panel">
                <span className="dashboard-label">Upcoming reservation</span>
                {upcoming ? <><h2>{new Date(upcoming.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h2><div className="dashboard-reservation-time"><CalendarDays /><strong>{new Date(upcoming.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</strong></div><p>Party of {upcoming.partySize} · {upcomingTable?.label ?? 'Table assigned soon'}</p><Link to="/reservations" className="secondary-button">View reservation</Link></> : <div className="dashboard-empty"><CalendarDays /><h2>No upcoming booking</h2><p>Reserve a table for a future visit.</p><Link to="/reservations" className="secondary-button">Book a table</Link></div>}
            </article>
        </div>

        <section className="dashboard-section"><div className="dashboard-section__header"><div><h2>Popular services</h2><p>Join a walk-in waitlist</p></div></div>
            <div className="service-grid">{mockServices.slice(0, 3).map(service => {
                const queueLength = mockQueueEntries.filter(entry => entry.serviceId === service.id).length
                return <article className="service-tile" key={service.id}><div><h3>{service.name}</h3><span className={service.status === 'open' ? 'service-open' : 'service-closed'}>{service.status === 'open' ? 'Open' : 'Closed'}</span></div><div className="service-tile__wait"><Clock3 size={17} /><strong>{service.estimatedWait}</strong></div><p>{queueLength} parties waiting</p><Link to="/join-queue">Join <span aria-hidden="true">→</span></Link></article>
            })}</div>
        </section>

        <section className="dashboard-section"><div className="dashboard-section__header"><div><h2>Notifications</h2><p>Recent updates</p></div><Link to="/notifications">View all</Link></div>
            <div className="dashboard-notifications">{notifications.slice(0, 3).map(note => <article key={note.id} className={note.read ? '' : 'is-unread'}><Bell size={16} /><div><strong>{note.title}</strong><p>{note.message}</p></div><time>{note.createdAt}</time></article>)}</div>
        </section>
    </section>
}
