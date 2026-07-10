import { Link } from '@tanstack/react-router'
import { useServices, useQueueLengths } from '../../api'
import { ServiceListItem } from './ServiceListItem'
import './admin-dashboard.css'

export function AdminDashboardPage() {
    const servicesQuery = useServices()
    const queueLengthsQuery = useQueueLengths()

    return (
        <div className="admin-dashboard">
            <div className="admin-dashboard__header">
                <h1>Admin Dashboard</h1>
                <div className="admin-dashboard__quick-actions">
                    <Link to="/admin/reservations" className="admin-dashboard__create-link">
                        Manage reservations
                    </Link>
                    <Link to="/admin/tables" className="admin-dashboard__create-link">
                        Manage tables
                    </Link>
                </div>
            </div>

            {servicesQuery.isLoading && <p>Loading services...</p>}
            {servicesQuery.isError && <p role="alert">Failed to load services: {servicesQuery.error.message}</p>}

            {servicesQuery.data && (
                <ul className="admin-dashboard__list">
                    {servicesQuery.data.map(service => (
                        <ServiceListItem
                            key={service.id}
                            service={service}
                            queueLength={queueLengthsQuery.data?.[service.id] ?? 0}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}
