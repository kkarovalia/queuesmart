import { createFileRoute } from '@tanstack/react-router'
import { QueueManagementPage } from '../../../features/queue-management/QueueManagementPage'

export const Route = createFileRoute('/admin/queue/$serviceId')({
    component: QueueManagementComponent,
})

function QueueManagementComponent() {
    const { serviceId } = Route.useParams()
    return (
        <QueueManagementPage serviceId={serviceId} />
    )
}
