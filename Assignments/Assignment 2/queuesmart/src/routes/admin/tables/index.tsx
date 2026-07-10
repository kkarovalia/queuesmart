import { createFileRoute } from '@tanstack/react-router'
import { TableManagementPage } from '../../../features/table-management/TableManagementPage'

export const Route = createFileRoute('/admin/tables/')({
    component: TableManagementPage,
})
