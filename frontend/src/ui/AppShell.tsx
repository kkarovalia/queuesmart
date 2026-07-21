import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
    Bell,
    CalendarDays,
    ClipboardList,
    ConciergeBell,
    History,
    LayoutDashboard,
    LogOut,
    Settings,
    TableProperties,
    UsersRound,
} from 'lucide-react'
import { useQueueFlow } from '../features/queue-flow/useQueueFlow'
import './AppShell.css'

const userLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/join-queue', label: 'Join Queue', icon: UsersRound },
    { to: '/queue-status', label: 'My Queue', icon: ClipboardList },
    { to: '/reservations', label: 'Reservations', icon: CalendarDays },
    { to: '/history', label: 'History', icon: History },
    { to: '/notifications', label: 'Notifications', icon: Bell },
] as const

const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/queue', label: 'Queue Management', icon: UsersRound },
    { to: '/admin/tables', label: 'Tables', icon: TableProperties },
    { to: '/admin/reservations', label: 'Reservations', icon: CalendarDays },
] as const

function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? 'brand brand--compact' : 'brand'}>
            <span className="brand__mark"><ConciergeBell aria-hidden="true" /></span>
            <span className="brand__name">Queue<span>Smart</span></span>
        </div>
    )
}

export function AppShell() {
    const pathname = useRouterState({ select: state => state.location.pathname })
    const { notifications } = useQueueFlow()
    const unreadCount = notifications.filter(notification => !notification.read).length
    const isAuth = pathname === '/login' || pathname === '/register'
    const isAdmin = pathname.startsWith('/admin')
    const links = isAdmin ? adminLinks : userLinks

    if (isAuth) {
        return (
            <main className="auth-shell">
                <Brand />
                <Outlet />
            </main>
        )
    }

    return (
        <div className="app-shell">
            <aside className="app-sidebar">
                <Brand compact />
                <div className="app-sidebar__identity">
                    <span className="app-sidebar__avatar">{isAdmin ? 'A' : 'JL'}</span>
                    <div><strong>{isAdmin ? 'Staff Console' : 'Jamie Lee'}</strong><span>{isAdmin ? 'Bistro 42' : 'Guest account'}</span></div>
                </div>
                <nav className="app-nav" aria-label={isAdmin ? 'Administrator navigation' : 'Customer navigation'}>
                    {links.map(({ to, label, icon: Icon }) => (
                        <Link key={to} to={to} activeOptions={{ exact: to === '/admin' || to === '/dashboard' }} activeProps={{ className: 'is-active' }}>
                            <Icon size={18} aria-hidden="true" />
                            <span>{label}</span>
                            {label === 'Notifications' && unreadCount > 0 ? <b>{unreadCount}</b> : null}
                        </Link>
                    ))}
                </nav>
                <div className="app-sidebar__utility">
                    <span><Settings size={17} aria-hidden="true" /> Settings</span>
                    <Link to={isAdmin ? '/dashboard' : '/admin'}>{isAdmin ? 'Customer view' : 'Admin demo'}</Link>
                    <Link to="/login"><LogOut size={17} aria-hidden="true" /> Log out</Link>
                </div>
            </aside>

            <div className="app-workspace">
                <header className="mobile-header">
                    <Brand compact />
                    <Link to="/notifications" aria-label={`${unreadCount} unread notifications`} className="mobile-header__bell">
                        <Bell size={20} />{unreadCount > 0 ? <b>{unreadCount}</b> : null}
                    </Link>
                </header>
                <main className="app-content"><Outlet /></main>
                <nav className="mobile-nav" aria-label="Mobile navigation">
                    {links.slice(0, 5).map(({ to, label, icon: Icon }) => (
                        <Link key={to} to={to} activeProps={{ className: 'is-active' }}>
                            <Icon size={19} aria-hidden="true" /><span>{label.replace(' Management', '')}</span>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    )
}
