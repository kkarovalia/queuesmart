import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { routeTree } from '../../routeTree.gen'

describe('admin dashboard', () => {
    it('opens and closes a service queue', async () => {
        // The toggle endpoint requires an authenticated admin (see
        // backend/src/modules/services/router.ts's requireAuth/requireRole),
        // so log in for real against the running backend first, the same
        // way LoginPage does, rather than mocking the request.
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'demo-admin' }),
        })
        const { token } = await loginResponse.json()
        window.localStorage.setItem('queuesmart_token', token)

        const user = userEvent.setup()
        const router = createRouter({ routeTree }); void router.navigate({ to: '/admin' })
        render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>)
        expect(await screen.findByText('Dinner Waitlist', {}, { timeout: 3000 })).toBeInTheDocument()
        const toggles = screen.getAllByRole('checkbox')
        expect(toggles[0]).toBeChecked()
        await user.click(toggles[0])
        await waitFor(() => expect(toggles[0]).not.toBeChecked(), { timeout: 3000 })
        await user.click(toggles[0])
        await waitFor(() => expect(toggles[0]).toBeChecked(), { timeout: 3000 })
    })
})
