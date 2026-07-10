import { createFileRoute } from '@tanstack/react-router'

// Stub for Kashf's Notifications feature (features/notifications).
// Swap this component body out once that feature is built; the
// dashboard's "View all notifications" link already points here.
export const Route = createFileRoute('/notifications')({
    component: NotificationsStub,
})

function NotificationsStub() {
    return (
        <div>
            <h1>Notifications</h1>
            <p>Coming soon.</p>
        </div>
    )
}
