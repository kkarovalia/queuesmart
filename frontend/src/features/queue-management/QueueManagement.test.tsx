import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueueManagementPage } from './QueueManagementPage'

const service = {
    id: 'mongo-service-id',
    name: 'Dinner Waitlist',
    description: 'Dinner service',
    expectedDurationMinutes: 45,
    priority: 'high',
    status: 'open',
}

describe('admin queue management', () => {
    beforeEach(() => {
        window.localStorage.setItem('queuesmart_token', 'admin-token')
    })

    it('shows the persisted queue and serves the next guest with admin auth', async () => {
        let served = false
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input)
            if (url.endsWith('/api/services')) return new Response(JSON.stringify([service]), { status: 200 })
            if (url.endsWith(`/api/queue/${service.id}/serve-next`)) {
                expect(init?.headers).toMatchObject({ Authorization: 'Bearer admin-token' })
                served = true
                return new Response(JSON.stringify({ served: { id: 'entry-1' }, nowAlmostReady: null }), { status: 200 })
            }
            if (url.endsWith(`/api/queue/${service.id}`)) {
                expect(init?.headers).toMatchObject({ Authorization: 'Bearer admin-token' })
                return new Response(JSON.stringify(served ? [] : [{
                    id: 'entry-1',
                    serviceId: service.id,
                    userId: 'mongo-user-id',
                    partySize: 3,
                    priority: 'high',
                    status: 'almost-ready',
                    joinedAt: '2026-08-07T18:00:00Z',
                    servedAt: null,
                    position: 1,
                }]), { status: 200 })
            }
            throw new Error(`Unexpected request: ${url}`)
        })
        vi.stubGlobal('fetch', fetchMock)

        const user = userEvent.setup()
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <QueueManagementPage serviceId={service.id} />
            </QueryClientProvider>,
        )

        expect(await screen.findAllByRole('listitem')).toHaveLength(1)
        await user.click(screen.getByRole('button', { name: /serve next/i }))
        await waitFor(() => expect(screen.queryAllByRole('listitem')).toHaveLength(0))
    })
})
