import { Link } from '@tanstack/react-router'
import { CalendarDays, Clock3, DoorOpen, UsersRound } from 'lucide-react'
import { useQueueLengths, useReservations, useServices } from '../../api'
import { ServiceListItem } from './ServiceListItem'
import './admin-dashboard.css'

export function AdminDashboardPage() {
    const servicesQuery = useServices()
    const queueLengthsQuery = useQueueLengths()
    const reservationsQuery = useReservations()
    const services = servicesQuery.data ?? []
    const lengths = queueLengthsQuery.data ?? {}
    const openCount = services.filter(service => service.status === 'open').length
    const totalQueued = Object.values(lengths).reduce((sum, value) => sum + value, 0)
    const averageWait = services.length ? Math.round(services.reduce((sum, service) => sum + service.expectedDurationMinutes, 0) / services.length) : 0

    return <section className="admin-dashboard page">
        <header className="page-header"><div><h1>Admin Overview</h1><p>Live service and seating operations for Bistro 42.</p></div><Link to="/admin/services/new" className="primary-button">Add service</Link></header>
        <div className="admin-metrics">
            <article><DoorOpen /><span>Open queues<strong>{openCount}</strong><small>services</small></span></article>
            <article><UsersRound /><span>Total in queue<strong>{totalQueued}</strong><small>parties</small></span></article>
            <article><Clock3 /><span>Average duration<strong>{averageWait}</strong><small>minutes</small></span></article>
            <article><CalendarDays /><span>Reservations<strong>{(reservationsQuery.data ?? []).filter(item => item.status === 'confirmed').length}</strong><small>confirmed</small></span></article>
        </div>
        <section className="admin-section panel"><div className="admin-section__header"><div><h2>Active services</h2><p>Open, close, edit, or inspect each queue.</p></div><div><Link to="/admin/reservations" className="secondary-button">Reservations</Link><Link to="/admin/tables" className="secondary-button">Tables</Link></div></div>
            {servicesQuery.isLoading ? <p className="admin-loading">Loading services...</p> : servicesQuery.isError ? <p role="alert">Failed to load services.</p> : <ul className="admin-dashboard__list">{services.map(service => <ServiceListItem key={service.id} service={service} queueLength={lengths[service.id] ?? 0} />)}</ul>}
        </section>
    </section>
}
