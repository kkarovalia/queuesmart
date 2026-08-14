import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatAssistantPage } from './ChatAssistantPage'

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <ChatAssistantPage />
        </QueryClientProvider>,
    )
}

describe('Queue Assistant', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('shows the welcome state and only renders customer-facing history messages', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([
            { role: 'system', content: 'hidden instructions' },
            { role: 'user', content: 'Where am I in line?' },
            { role: 'assistant', content: 'You are second in line.' },
            { role: 'assistant', content: null, tool_calls: [] },
            { role: 'tool', content: 'internal result' },
        ]), { status: 200 })))

        renderPage()

        expect(await screen.findByText('Where am I in line?')).toBeInTheDocument()
        expect(screen.getByText('You are second in line.')).toBeInTheDocument()
        expect(screen.queryByText('hidden instructions')).not.toBeInTheDocument()
        expect(screen.queryByText('internal result')).not.toBeInTheDocument()
    })

    it('sends plain text with the signed-in token and displays the reply', async () => {
        window.localStorage.setItem('queuesmart_token', 'customer-token')
        const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return new Response(JSON.stringify([
                    { role: 'assistant', content: null, tool_calls: [] },
                    { role: 'tool', content: 'queue lookup result' },
                    { role: 'assistant', content: 'Dinner Waitlist is open with a short wait.' },
                ]), { status: 200 })
            }
            return new Response(JSON.stringify([]), { status: 200 })
        })
        vi.stubGlobal('fetch', fetchMock)
        const user = userEvent.setup()

        renderPage()
        expect(await screen.findByText('Your queue, one message away')).toBeInTheDocument()

        await user.type(screen.getByLabelText('Message Queue Assistant'), 'What queues are open?')
        await user.click(screen.getByRole('button', { name: 'Send message' }))

        expect(await screen.findByText('Dinner Waitlist is open with a short wait.')).toBeInTheDocument()
        expect(screen.getByText('What queues are open?')).toBeInTheDocument()

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
        const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
        expect(postCall?.[0]).toBe('http://localhost:3001/api/chat')
        expect(postCall?.[1]).toMatchObject({
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                Authorization: 'Bearer customer-token',
            },
            body: 'What queues are open?',
        })
    })

    it('restores the message when sending fails', async () => {
        const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return new Response(JSON.stringify({ error: 'Assistant unavailable' }), { status: 503 })
            }
            return new Response(JSON.stringify([]), { status: 200 })
        })
        vi.stubGlobal('fetch', fetchMock)
        const user = userEvent.setup()

        renderPage()
        expect(await screen.findByText('Your queue, one message away')).toBeInTheDocument()
        const input = screen.getByLabelText('Message Queue Assistant')
        await user.type(input, 'Check my queue')
        await user.click(screen.getByRole('button', { name: 'Send message' }))

        expect(await screen.findByRole('alert')).toHaveTextContent('Assistant unavailable')
        expect(input).toHaveValue('Check my queue')
    })
})
