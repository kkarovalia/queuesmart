import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { QueueFlowProvider } from '../features/queue-flow/QueueFlowProvider'

// Regression test for a real, 100%-reproducible bug: right after a
// successful login, AppShell's auth guard would bounce straight back to
// /login before the user actually appeared, because useUser()'s query
// already had `data: null` cached from an earlier unauthenticated check on
// the same page load (the /login page mounts AppShell too), and
// TanStack Query's `isLoading` only reflects a query's very first fetch,
// not the invalidate-triggered refetch that follows login. Found by
// actually driving a browser, not by any test — this file exists so it
// can't regress silently again.
//
// Uses the real useUser()/QueueFlowProvider, not a mocked hook, so the fix
// is verified against real TanStack Query cache semantics rather than a
// hand-simulated isFetching flag that could pass for the wrong reason.

vi.mock('../api', async () => {
    const actual = await vi.importActual<typeof import('../api')>('../api')
    return {
        ...actual,
        useServices: () => ({ data: [] }),
        useNotifications: () => ({ data: [] }),
        useMarkNotificationRead: () => ({ mutate: vi.fn() }),
    }
})

function buildRouter(initialPath: string) {
    const rootRoute = createRootRoute({
        component: () => <QueueFlowProvider><AppShell /></QueueFlowProvider>,
    })
    const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: () => <div>Login Marker</div> })
    const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: () => <div>Admin Marker</div> })
    return createRouter({
        routeTree: rootRoute.addChildren([loginRoute, adminRoute]),
        history: createMemoryHistory({ initialEntries: [initialPath] }),
    })
}

describe('AppShell auth guard - post-login race', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        window.localStorage.clear()
    })

    it('does not bounce back to /login while the post-login user refetch is still in flight', async () => {
        let resolveMe: () => void
        const meDelay = new Promise<void>(resolve => { resolveMe = resolve })

        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)
            if (url.endsWith('/api/auth/me')) {
                const token = window.localStorage.getItem('queuesmart_token')
                if (!token) return new Response(JSON.stringify(null), { status: 200 })
                await meDelay
                return new Response(JSON.stringify({ name: 'Alex Admin', email: 'admin@example.com', role: 'admin' }), { status: 200 })
            }
            throw new Error(`Unexpected fetch: ${url}`)
        }))

        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        const router = buildRouter('/login')
        render(
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>,
        )

        // Starts unauthenticated on /login — useUser() resolves data: null
        // fast (no token), exactly the pre-login state that caches the
        // stale null the race depends on.
        expect(await screen.findByText('Login Marker')).toBeInTheDocument()

        // Simulate exactly what a successful login does: set the token,
        // invalidate the 'user' query (kicks off a refetch that won't
        // resolve until resolveMe() below), then navigate — all
        // synchronously, like LoginPage's onSuccess does.
        window.localStorage.setItem('queuesmart_token', 'admin-token')
        queryClient.invalidateQueries({ queryKey: ['user'] })
        await router.navigate({ to: '/admin' })

        // The refetch is still pending. The old guard would already have
        // bounced back to /login here.
        await new Promise(resolve => setTimeout(resolve, 50))
        expect(screen.queryByText('Login Marker')).not.toBeInTheDocument()
        expect(screen.getByText('Admin Marker')).toBeInTheDocument()

        // Let the refetch resolve, confirming it eventually settles as the
        // now-authenticated admin, still without ever having bounced away.
        resolveMe!()
        await waitFor(() => expect(screen.getByText('Alex Admin')).toBeInTheDocument())
        expect(screen.queryByText('Login Marker')).not.toBeInTheDocument()
    })
})
