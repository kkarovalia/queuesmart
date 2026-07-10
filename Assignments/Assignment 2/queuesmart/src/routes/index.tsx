import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: HomePage,
})

function HomePage() {
    return (
        <div>
            <h1>QueueSmart</h1>
            <p>Smart queue management for restaurants.</p>
            <p>
                <Link to="/admin">Go to Admin Dashboard</Link>
            </p>
        </div>
    )
}
