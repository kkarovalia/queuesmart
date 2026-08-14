import { useEffect } from 'react'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import {
    Bell,
    ClipboardList,
    ConciergeBell,
    FileBarChart,
    History,
    LayoutDashboard,
    LogOut,
    MessageCircle,
    UsersRound,
} from 'lucide-react'
import { useQueueFlow } from '../features/queue-flow/useQueueFlow'
import { useLogout, useUser } from '../api'
import './AppShell.css'

// Tables/Reservations have no real backend yet (same gap since A3) — left
// out of the nav so the demo doesn't wander into features with no data
// behind them. Routes/pages still exist, just not linked from here.
const userLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/join-queue', label: 'Join Queue', icon: UsersRound },
    { to: '/queue-status', label: 'My Queue', icon: ClipboardList },
    { to: '/assistant', label: 'Queue Assistant', icon: MessageCircle },
    { to: '/history', label: 'History', icon: History },
    { to: '/notifications', label: 'Notifications', icon: Bell },
] as const

const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/queue', label: 'Queue Management', icon: UsersRound },
    { to: '/admin/history', label: 'History', icon: History },
    { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
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
    const navigate = useNavigate()
    const logout = useLogout()
    const { data: user, isLoading: userLoading } = useUser()
    const { notifications } = useQueueFlow()
    const unreadCount = notifications.filter(notification => !notification.read).length
    const isAuth = pathname === '/login' || pathname === '/register'
    const isAdmin = pathname.startsWith('/admin')
    const links = isAdmin ? adminLinks : userLinks

    // No frontend route is otherwise gated by authentication — without this,
    // any URL is reachable directly regardless of login state. The backend
    // still enforces requireAuth/requireRole on every real action, but a
    // logged-out (or wrong-role) visitor shouldn't even see the page shell.
    useEffect(() => {
        if (userLoading || isAuth) return
        if (!user) {
            navigate({ to: '/login' })
            return
        }
        if (isAdmin && user.role !== 'admin') {
            navigate({ to: '/dashboard' })
        }
    }, [userLoading, isAuth, user, isAdmin, navigate])

    const identityInitial = userLoading
        ? '…'
        : (user?.name?.[0]?.toUpperCase() ?? '?')
    const identityName = userLoading
        ? 'Loading…'
        : (user?.name ?? 'Not signed in')
    const identityRole = userLoading
        ? ''
        : (user?.role === 'admin' ? 'Administrator' : user ? 'Customer' : '')

    if (isAuth) {
        return (
            <main className="auth-shell">
                <Brand />
                <Outlet />
            </main>
        )
    }

    // A redirect is already in flight from the effect above — render nothing
    // rather than flash the shell (or the wrong role's nav) for a tick.
    if (!userLoading && (!user || (isAdmin && user.role !== 'admin'))) {
        return null
    }

    return (
        <div className="app-shell">
            <aside className="app-sidebar">
                <Brand compact />
                <div className="app-sidebar__identity">
                    <span className="app-sidebar__avatar">{identityInitial}</span>
                    <div><strong>{identityName}</strong>{identityRole && <span>{identityRole}</span>}</div>
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
                    {user?.role === 'admin' && (
                        <Link to={isAdmin ? '/dashboard' : '/admin'}>{isAdmin ? 'Customer view' : 'Admin view'}</Link>
                    )}
                    <Link to="/login" onClick={() => logout()}>
                        <LogOut size={17} aria-hidden="true" /> Log out
                    </Link>
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
