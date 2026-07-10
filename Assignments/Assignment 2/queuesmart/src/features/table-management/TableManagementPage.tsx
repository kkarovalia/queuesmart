import { Link } from '@tanstack/react-router'
import { useTables } from '../../api'
import { TableListItem } from './TableListItem'
import '../admin-dashboard/admin-dashboard.css'

export function TableManagementPage() {
    const tablesQuery = useTables()

    return (
        <div className="admin-dashboard">
            <div className="admin-dashboard__header">
                <h1>Table Management</h1>
                <Link to="/admin/tables/new" className="admin-dashboard__create-link">
                    + Add table
                </Link>
            </div>

            {tablesQuery.isLoading && <p>Loading tables...</p>}
            {tablesQuery.isError && <p role="alert">Failed to load tables: {tablesQuery.error.message}</p>}

            {tablesQuery.data && (
                <ul className="admin-dashboard__list">
                    {tablesQuery.data.map(table => (
                        <TableListItem key={table.id} table={table} />
                    ))}
                </ul>
            )}
        </div>
    )
}
