import { createFileRoute } from '@tanstack/react-router'

// Stub for Ian's Queue Management feature (features/queue-management).
// Swap this component body out once that feature is built; the URL and the
// dashboard's "View queue" link already point here.
export const Route = createFileRoute('/admin/queue/$serviceId')({
    component: QueueManagementStub,
})

function QueueManagementStub() {
    const { serviceId } = Route.useParams()
    return (
        <div>
            <h1>Queue Management</h1>
            <p>Coming soon. Service: {serviceId}</p>
        </div>
    )
}
