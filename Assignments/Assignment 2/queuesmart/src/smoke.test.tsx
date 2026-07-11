import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

// Real rendering smoke test, not just a build check. Mounts the
// actual app router and confirms something real shows up. This is
// the check that would have caught the blank-white-page bug from
// earlier in the project (build succeeded, page didn't render).
describe('app boots', () => {
    it('redirects the home page to login', async () => {
        const router = createRouter({ routeTree })
        const qc = new QueryClient()

        render(
            <QueryClientProvider client={qc}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        )

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
        }, { timeout: 8000 })
    }, 15000)

    it('renders the user dashboard at /dashboard', async () => {
        const router = createRouter({ routeTree })
        router.navigate({ to: '/dashboard' })
        const qc = new QueryClient()

        render(
            <QueryClientProvider client={qc}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        )

        await waitFor(() => {
            expect(screen.getByText(/popular services/i)).toBeInTheDocument()
        }, { timeout: 8000 })
    }, 15000)
})
