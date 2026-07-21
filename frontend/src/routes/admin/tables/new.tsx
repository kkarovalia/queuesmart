import { createFileRoute } from '@tanstack/react-router'
import { TableFormPage } from '../../../features/table-management/TableFormPage'

export const Route = createFileRoute('/admin/tables/new')({
    component: () => <TableFormPage mode="create" />,
})
