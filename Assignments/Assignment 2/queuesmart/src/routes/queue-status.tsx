import { createFileRoute } from '@tanstack/react-router'

// Stub for Kashf's Queue Status feature (features/queue-status).
// Swap this component body out once that feature is built; the
// dashboard's "View status" link already points here.
export const Route = createFileRoute('/queue-status')({
    component: QueueStatusStub,
})

function QueueStatusStub() {
    return (
        <div>
            <h1>Queue Status</h1>
            <p>Coming soon.</p>
        </div>
    )
}
