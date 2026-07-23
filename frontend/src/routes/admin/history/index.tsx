import { createFileRoute } from '@tanstack/react-router'
import { AdminHistoryPage } from '../../../features/admin-history/AdminHistoryPage'

export const Route = createFileRoute('/admin/history/')({
    component: AdminHistoryPage,
})
