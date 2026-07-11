import { createFileRoute } from '@tanstack/react-router'
import { ServiceFormPage } from '../../../../features/service-management/ServiceFormPage'

export const Route = createFileRoute('/admin/services/$serviceId/edit')({
    component: RouteComponent,
})

function RouteComponent() {
    const { serviceId } = Route.useParams()
    return <ServiceFormPage serviceId={serviceId} />
}
