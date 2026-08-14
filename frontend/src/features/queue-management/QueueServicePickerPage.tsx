import { Link } from '@tanstack/react-router'
import { ListOrdered } from 'lucide-react'
import { useServices } from '../../api'
import { StatusBadge } from '../../ui/StatusBadge'
import './queue-management.css'

export function QueueServicePickerPage() {
    const servicesQuery = useServices()
    const services = servicesQuery.data ?? []

    return (
        <section className="queue-management page">
            <header className="page-header">
                <div><h1>Queue Management</h1><p>Choose a service to view and manage its live queue.</p></div>
            </header>

            {servicesQuery.isLoading && <p>Loading services...</p>}
            {servicesQuery.isError && <p role="alert">Failed to load services.</p>}

            {services.length > 0 && (
                <div className="queue-management__table panel">
                    <div className="queue-picker-row queue-picker-row--head"><span>Service</span><span>Priority</span><span>Status</span><span>Manage</span></div>
                    <ol>
                        {services.map(service => (
                            <li className="queue-picker-row" key={service.id}>
                                <span>{service.name}</span>
                                <span><StatusBadge kind="priority" value={service.priority} /></span>
                                <span><StatusBadge kind="status" value={service.status} /></span>
                                <span>
                                    <Link className="icon-button" to="/admin/queue/$serviceId" params={{ serviceId: service.id }} aria-label={`Manage ${service.name} queue`} title="Manage queue">
                                        <ListOrdered size={16} />
                                    </Link>
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </section>
    )
}
