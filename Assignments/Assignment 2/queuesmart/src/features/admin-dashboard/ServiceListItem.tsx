import { Link } from '@tanstack/react-router'
import { ListOrdered, Pencil } from 'lucide-react'
import type { Service } from '../../contracts/types'
import { useToggleServiceStatus } from '../../api'
import { StatusBadge } from '../../ui/StatusBadge'

export function ServiceListItem({ service, queueLength }: { service: Service; queueLength: number }) {
    const toggleStatus = useToggleServiceStatus()
    return <li className="service-list-item">
        <div className="service-list-item__info"><div className="service-list-item__heading"><span className="service-list-item__name">{service.name}</span><StatusBadge kind="status" value={service.status} /><StatusBadge kind="priority" value={service.priority} /></div><p className="service-list-item__description">{service.description}</p></div>
        <div className="service-list-item__number"><strong>{queueLength}</strong><span>in queue</span></div>
        <div className="service-list-item__number"><strong>{service.expectedDurationMinutes}</strong><span>min duration</span></div>
        <label className="service-toggle"><input type="checkbox" checked={service.status === 'open'} onChange={() => toggleStatus.mutate(service.id)} disabled={toggleStatus.isPending} /><span /> <b>{service.status === 'open' ? 'Open' : 'Closed'}</b></label>
        <div className="service-list-item__actions"><Link className="icon-button" to="/admin/queue/$serviceId" params={{ serviceId: service.id }} aria-label={`View ${service.name} queue`} title="View queue"><ListOrdered size={16} /></Link><Link className="icon-button" to="/admin/services/$serviceId/edit" params={{ serviceId: service.id }} aria-label={`Edit ${service.name}`} title="Edit service"><Pencil size={16} /></Link></div>
    </li>
}
