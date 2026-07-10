import { Link, Outlet } from '@tanstack/react-router'
import './AppShell.css'

export function AppShell() {
    return (
        <div className="app-shell">
            <header className="app-shell__header">
                <span className="app-shell__title">QueueSmart</span>
                <nav className="app-shell__nav">
                    <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'is-active' }}>
                        Home
                    </Link>
                    <Link to="/dashboard" activeProps={{ className: 'is-active' }}>
                        Dashboard
                    </Link>
                    <Link to="/join-queue" activeProps={{ className: 'is-active' }}>
                        Join Queue
                    </Link>
                    <Link to="/queue-status" activeProps={{ className: 'is-active' }}>
                        Queue Status
                    </Link>
                    <Link to="/history" activeProps={{ className: 'is-active' }}>
                        History
                    </Link>
                    <Link to="/notifications" activeProps={{ className: 'is-active' }}>
                        Notifications
                    </Link>
                    <Link to="/admin" activeProps={{ className: 'is-active' }}>
                        Admin Dashboard
                    </Link>
                    <Link to="/admin/reservations" activeProps={{ className: 'is-active' }}>
                        Reservations
                    </Link>
                    <Link to="/admin/tables" activeProps={{ className: 'is-active' }}>
                        Tables
                    </Link>
                    <Link to="/login" activeProps={{ className: 'is-active' }}>
                        Log in
                    </Link>
                </nav>
            </header>
            <main className="app-shell__content">
                <Outlet />
            </main>
        </div>
    )
}
