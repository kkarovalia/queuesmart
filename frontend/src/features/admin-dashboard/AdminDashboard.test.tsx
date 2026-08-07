import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeTree } from '../../routeTree.gen'

describe('admin dashboard', () => {
    beforeEach(() => {
        window.localStorage.setItem('queuesmart_token', 'admin-token')
    })

    it('opens and closes a service queue', async () => {
        let status: 'open' | 'closed' = 'open'
        const service = () => ({
            id: 'mongo-service-id',
            name: 'Dinner Waitlist',
            description: 'Dinner service',
            expectedDurationMinutes: 45,
            priority: 'high',
            status,
        })
        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input)
            if (url.endsWith('/api/services')) return new Response(JSON.stringify([service()]), { status: 200 })
            if (url.endsWith('/api/services/mongo-service-id/status')) {
                expect(init?.headers).toMatchObject({ Authorization: 'Bearer admin-token' })
                status = status === 'open' ? 'closed' : 'open'
                return new Response(JSON.stringify(service()), { status: 200 })
            }
            throw new Error(`Unexpected request: ${url}`)
        }))

        const user = userEvent.setup()
        const router = createRouter({ routeTree })
        void router.navigate({ to: '/admin' })
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <RouterProvider router={router} />
            </QueryClientProvider>,
        )

        expect(await screen.findByText('Dinner Waitlist')).toBeInTheDocument()
        const toggle = screen.getByRole('checkbox')
        expect(toggle).toBeChecked()
        await user.click(toggle)
        await waitFor(() => expect(toggle).not.toBeChecked())
        await user.click(toggle)
        await waitFor(() => expect(toggle).toBeChecked())
    })
})
