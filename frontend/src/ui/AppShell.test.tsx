import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

// AppShell gates every non-/login/register route behind an auth check: no
// user -> /login, wrong role for /admin/* -> /dashboard. This is the guard
// that had a real, 100%-reproducible bug (see AppShell.auth-race.test.tsx)
// that shipped undetected because nothing exercised it directly before.

const userMock = vi.hoisted(() => vi.fn())

vi.mock('../api', () => ({
    useUser: () => userMock(),
    useLogout: () => vi.fn(),
}))

vi.mock('../features/queue-flow/useQueueFlow', () => ({
    useQueueFlow: () => ({ notifications: [] }),
}))

function buildRouter(initialPath: string) {
    const rootRoute = createRootRoute({ component: AppShell })
    const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: () => <div>Login Marker</div> })
    const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: () => <div>Dashboard Marker</div> })
    const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: () => <div>Admin Marker</div> })
    return createRouter({
        routeTree: rootRoute.addChildren([loginRoute, dashboardRoute, adminRoute]),
        history: createMemoryHistory({ initialEntries: [initialPath] }),
    })
}

describe('AppShell auth guard', () => {
    beforeEach(() => {
        userMock.mockReset()
    })

    it('redirects an unauthenticated visitor to /login', async () => {
        userMock.mockReturnValue({ data: null, isLoading: false, isFetching: false })
        const router = buildRouter('/dashboard')
        render(<RouterProvider router={router} />)

        expect(await screen.findByText('Login Marker')).toBeInTheDocument()
    })

    it('redirects a non-admin user away from /admin', async () => {
        userMock.mockReturnValue({ data: { name: 'Jamie Lee', email: 'jamie@example.com', role: 'user' }, isLoading: false, isFetching: false })
        const router = buildRouter('/admin')
        render(<RouterProvider router={router} />)

        expect(await screen.findByText('Dashboard Marker')).toBeInTheDocument()
    })

    it('lets an admin stay on /admin and shows the admin nav', async () => {
        userMock.mockReturnValue({ data: { name: 'Alex Admin', email: 'admin@example.com', role: 'admin' }, isLoading: false, isFetching: false })
        const router = buildRouter('/admin')
        render(<RouterProvider router={router} />)

        expect(await screen.findByText('Admin Marker')).toBeInTheDocument()
        expect(screen.getByRole('navigation', { name: /administrator navigation/i })).toBeInTheDocument()
        expect(screen.getByText('Alex Admin')).toBeInTheDocument()
    })

    it('lets a regular user stay on /dashboard and shows the customer nav', async () => {
        userMock.mockReturnValue({ data: { name: 'Jamie Lee', email: 'jamie@example.com', role: 'user' }, isLoading: false, isFetching: false })
        const router = buildRouter('/dashboard')
        render(<RouterProvider router={router} />)

        expect(await screen.findByText('Dashboard Marker')).toBeInTheDocument()
        expect(screen.getByRole('navigation', { name: /customer navigation/i })).toBeInTheDocument()
    })
})
