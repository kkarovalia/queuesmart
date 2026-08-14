import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateServicePage } from './CreateServicePage'
import { ServiceFormPage } from './ServiceFormPage'

const apiMocks = vi.hoisted(() => ({
    createService: vi.fn(),
    updateService: vi.fn(),
}))

vi.mock('../../api', () => ({
    useCreateService: () => ({ mutate: apiMocks.createService, isPending: false, isError: false }),
    useUpdateService: () => ({ mutate: apiMocks.updateService, isPending: false, isError: false }),
    useService: () => ({
        isLoading: false,
        isError: false,
        data: {
            id: 'svc-1',
            name: 'Dinner Waitlist',
            description: 'Existing description',
            expectedDurationMinutes: 45,
            priority: 'high',
            status: 'open',
            estimatedWait: '45 min',
            tablePreferenceLabel: 'Any available table',
        },
    }),
}))

function buildRouter(initialPath: string) {
    const rootRoute = createRootRoute()
    const newRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/services/new', component: CreateServicePage })
    const editRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/services/$serviceId/edit', component: () => <ServiceFormPage serviceId="svc-1" /> })
    const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: () => <div>Admin Marker</div> })
    return createRouter({
        routeTree: rootRoute.addChildren([newRoute, editRoute, adminRoute]),
        history: createMemoryHistory({ initialEntries: [initialPath] }),
    })
}

function renderAt(path: string) {
    const router = buildRouter(path)
    render(
        <QueryClientProvider client={new QueryClient()}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    )
}

describe('service management', () => {
    beforeEach(() => {
        apiMocks.createService.mockReset()
        apiMocks.updateService.mockReset()
    })

    it('creates a service with the form values and navigates to /admin on success', async () => {
        apiMocks.createService.mockImplementation((_values, { onSuccess }) => onSuccess())
        const user = userEvent.setup()
        renderAt('/admin/services/new')

        await user.type(await screen.findByLabelText(/service name/i), 'Patio Overflow')
        await user.type(screen.getByLabelText(/description/i), 'Extra patio seating')
        await user.clear(screen.getByLabelText(/expected duration/i))
        await user.type(screen.getByLabelText(/expected duration/i), '25')
        await user.selectOptions(screen.getByLabelText(/priority level/i), 'low')
        await user.click(screen.getByRole('button', { name: /create service/i }))

        expect(apiMocks.createService).toHaveBeenCalledWith(
            { name: 'Patio Overflow', description: 'Extra patio seating', expectedDurationMinutes: 25, priority: 'low' },
            expect.anything(),
        )
        await waitFor(() => expect(screen.getByText('Admin Marker')).toBeInTheDocument())
    })

    it('does not submit when required fields are missing', async () => {
        const user = userEvent.setup()
        renderAt('/admin/services/new')

        await user.click(await screen.findByRole('button', { name: /create service/i }))

        expect(apiMocks.createService).not.toHaveBeenCalled()
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })

    it('edits an existing service pre-filled with its current values', async () => {
        apiMocks.updateService.mockImplementation((_args, { onSuccess }) => onSuccess())
        const user = userEvent.setup()
        renderAt('/admin/services/svc-1/edit')

        const nameInput = await screen.findByLabelText(/service name/i) as HTMLInputElement
        expect(nameInput.value).toBe('Dinner Waitlist')

        await user.clear(nameInput)
        await user.type(nameInput, 'Dinner Waitlist Renamed')
        await user.click(screen.getByRole('button', { name: /save changes/i }))

        expect(apiMocks.updateService).toHaveBeenCalledWith(
            { id: 'svc-1', input: expect.objectContaining({ name: 'Dinner Waitlist Renamed' }) },
            expect.anything(),
        )
        await waitFor(() => expect(screen.getByText('Admin Marker')).toBeInTheDocument())
    })
})
