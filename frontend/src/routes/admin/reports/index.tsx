import { createFileRoute } from '@tanstack/react-router'
import { AdminReportsPage } from '../../../features/admin-reports/AdminReportsPage'

export const Route = createFileRoute('/admin/reports/')({
    component: AdminReportsPage,
})
