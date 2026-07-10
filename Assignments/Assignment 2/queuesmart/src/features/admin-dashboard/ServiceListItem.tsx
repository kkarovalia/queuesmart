import { Link } from '@tanstack/react-router'
import type { Service } from '../../contracts/types'
import { StatusBadge } from '../../ui/StatusBadge'
import { useToggleServiceStatus } from '../../api'

interface ServiceListItemProps {
    service: Service
    queueLength: number
}

export function ServiceListItem({ service, queueLength }: ServiceListItemProps) {
    const toggleStatus = useToggleServiceStatus()

    return (
        <li className="service-list-item">
            <div className="service-list-item__info">
                <div className="service-list-item__heading">
                    <span className="service-list-item__name">{service.name}</span>
                    <StatusBadge kind="status" value={service.status} />
                    <StatusBadge kind="priority" value={service.priority} />
                </div>
                <p className="service-list-item__description">{service.description}</p>
                <p className="service-list-item__queue-length">Queue length: {queueLength}</p>
            </div>
            <div className="service-list-item__actions">
                <button
                    type="button"
                    onClick={() => toggleStatus.mutate(service.id)}
                    disabled={toggleStatus.isPending}
                >
                    {service.status === 'open' ? 'Close queue' : 'Open queue'}
                </button>
                <Link to="/admin/queue/$serviceId" params={{ serviceId: service.id }}>
                    View queue
                </Link>
                <Link to="/admin/services/$serviceId/edit" params={{ serviceId: service.id }}>
                    Edit
                </Link>
            </div>
        </li>
    )
}
