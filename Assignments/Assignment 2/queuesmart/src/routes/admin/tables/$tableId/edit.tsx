import { createFileRoute } from '@tanstack/react-router'
import { TableFormPage } from '../../../../features/table-management/TableFormPage'

export const Route = createFileRoute('/admin/tables/$tableId/edit')({
    component: RouteComponent,
})

function RouteComponent() {
    const { tableId } = Route.useParams()
    return <TableFormPage mode="edit" tableId={tableId} />
}
