import { createFileRoute } from '@tanstack/react-router'
import { UserDashboardPage } from '../features/user-dashboard/UserDashboardPage'

export const Route = createFileRoute('/dashboard')({
    component: UserDashboardPage,
})
