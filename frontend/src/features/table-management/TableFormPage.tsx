import { useNavigate } from '@tanstack/react-router'
import type { TableFormInput } from '../../contracts/types'
import { useCreateTable, useUpdateTable, useTable } from '../../api'
import { TableForm } from './TableForm'

interface CreateModeProps {
    mode: 'create'
}

interface EditModeProps {
    mode: 'edit'
    tableId: string
}

type TableFormPageProps = CreateModeProps | EditModeProps

export function TableFormPage(props: TableFormPageProps) {
    if (props.mode === 'edit') {
        return <EditTableFormPage tableId={props.tableId} />
    }
    return <CreateTableFormPage />
}

function CreateTableFormPage() {
    const navigate = useNavigate()
    const createTable = useCreateTable()

    function handleSubmit(values: TableFormInput) {
        createTable.mutate(values, {
            onSuccess: () => navigate({ to: '/admin/tables' }),
        })
    }

    return (
        <section className="page"><header className="page-header"><div><h1>Add Table</h1><p>Configure seating capacity and restaurant section.</p></div></header>
            <TableForm mode="create" onSubmit={handleSubmit} isSubmitting={createTable.isPending} />
        </section>
    )
}

function EditTableFormPage({ tableId }: { tableId: string }) {
    const navigate = useNavigate()
    const tableQuery = useTable(tableId)
    const updateTable = useUpdateTable()

    function handleSubmit(values: TableFormInput) {
        updateTable.mutate(
            { id: tableId, input: values },
            { onSuccess: () => navigate({ to: '/admin/tables' }) },
        )
    }

    if (tableQuery.isLoading) {
        return <p>Loading table...</p>
    }

    if (tableQuery.isError) {
        return <p role="alert">Failed to load table: {tableQuery.error.message}</p>
    }

    if (!tableQuery.data) {
        return <p role="alert">Table not found.</p>
    }

    return (
        <section className="page"><header className="page-header"><div><h1>Edit Table</h1><p>Update this table's capacity and section.</p></div></header>
            <TableForm
                mode="edit"
                initialValues={tableQuery.data}
                onSubmit={handleSubmit}
                isSubmitting={updateTable.isPending}
            />
        </section>
    )
}
