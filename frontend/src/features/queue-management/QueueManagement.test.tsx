import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { QueueManagementPage } from './QueueManagementPage'

function renderQueue() {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><QueueManagementPage serviceId="svc-1" /></QueryClientProvider>)
}

describe('admin queue management', () => {
    it('reorders, removes, adds, and serves guests in the working queue', async () => {
        const user = userEvent.setup(); renderQueue()
        expect(await screen.findByText('Emily Johnson', {}, { timeout: 3000 })).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: /move emily johnson down/i }))
        await user.click(screen.getByRole('button', { name: /remove maya patel/i }))
        expect(screen.queryByText('Maya Patel')).not.toBeInTheDocument()
        await user.type(screen.getByLabelText(/walk-in guest name/i), 'Taylor Reed')
        await user.click(screen.getByRole('button', { name: /add to queue/i }))
        expect(screen.getByText('Taylor Reed')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: /serve next/i }))
        expect(screen.getByText(/marked served/i)).toBeInTheDocument()
    })
})
