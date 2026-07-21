import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { routeTree } from '../../routeTree.gen'

function renderRoute(path: '/login' | '/register') {
    const router = createRouter({ routeTree })
    void router.navigate({ to: path })
    render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>)
}

describe('authentication validation', () => {
    it('validates login email and password', async () => {
        const user = userEvent.setup(); renderRoute('/login')
        await user.click(await screen.findByRole('button', { name: /^log in$/i }))
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })

    it('validates registration fields and matching passwords', async () => {
        const user = userEvent.setup(); renderRoute('/register')
        await user.type(await screen.findByLabelText(/email/i), 'invalid')
        await user.type(screen.getByLabelText(/^password$/i), 'secret1')
        await user.type(screen.getByLabelText(/confirm password/i), 'secret2')
        await user.click(screen.getByRole('button', { name: /create account/i }))
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/valid email/i)).toBeInTheDocument()
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
})
