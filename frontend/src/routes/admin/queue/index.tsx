import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/queue/')({
    beforeLoad: () => { throw redirect({ to: '/admin/queue/$serviceId', params: { serviceId: 'svc-1' } }) },
})
