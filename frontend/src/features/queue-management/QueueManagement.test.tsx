import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { QueueManagementPage } from './QueueManagementPage'

function renderQueue() {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><QueueManagementPage serviceId="svc-2" /></QueryClientProvider>)
}

describe('admin queue management', () => {
    it('shows the real queue for a service and serves the next guest', async () => {
        // svc-2, not svc-1: QueueFlow.test.tsx drives svc-1 against this same
        // live backend, and Vitest runs test files in parallel, so sharing a
        // service between the two files would have them serve/clear each
        // other's queue entries out from under one another.
        //
        // Guarantee at least one party is actually waiting, regardless of what
        // earlier test runs against this same dev server may have already served.
        await fetch('http://localhost:3001/api/queue/svc-2/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: `test-admin-view-${crypto.randomUUID()}`, partySize: 3 }),
        })

        const user = userEvent.setup()
        renderQueue()

        const rowsBefore = await screen.findAllByRole('listitem', {}, { timeout: 3000 })
        const countBefore = rowsBefore.length
        expect(countBefore).toBeGreaterThan(0)

        await user.click(screen.getByRole('button', { name: /serve next/i }))

        // queryAllByRole (not findAllByRole/getAllByRole): the expected count
        // can legitimately be zero, and the find*/get* variants never resolve
        // to an empty match — they keep retrying until timeout instead.
        await waitFor(() => {
            expect(screen.queryAllByRole('listitem')).toHaveLength(countBefore - 1)
        }, { timeout: 3000 })
    })
})
