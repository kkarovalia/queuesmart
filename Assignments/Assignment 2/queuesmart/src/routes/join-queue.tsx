import { createFileRoute } from '@tanstack/react-router'

// Stub for Kashf's Join Queue feature (features/join-queue).
// Swap this component body out once that feature is built; the
// dashboard's "Join" links already point here.
export const Route = createFileRoute('/join-queue')({
    component: JoinQueueStub,
})

function JoinQueueStub() {
    return (
        <div>
            <h1>Join Queue</h1>
            <p>Coming soon.</p>
        </div>
    )
}
