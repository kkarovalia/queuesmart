import { Link } from '@tanstack/react-router'
import type { Table } from '../../contracts/types'
import { StatusBadge } from '../../ui/StatusBadge'
import { useDeleteTable } from '../../api'

interface TableListItemProps {
    table: Table
}

export function TableListItem({ table }: TableListItemProps) {
    const deleteTable = useDeleteTable()

    return (
        <li className="service-list-item management-list-item">
            <div className="service-list-item__info">
                <div className="service-list-item__heading">
                    <span className="service-list-item__name">{table.label}</span>
                    <StatusBadge kind="tableStatus" value={table.status} />
                </div>
                <p className="service-list-item__description">
                    {table.section} &middot; Seats {table.seats}
                </p>
            </div>
            <div className="management-list-item__actions">
                <Link className="secondary-button" to="/admin/tables/$tableId/edit" params={{ tableId: table.id }}>
                    Edit
                </Link>
                <button className="danger-button"
                    type="button"
                    onClick={() => deleteTable.mutate(table.id)}
                    disabled={deleteTable.isPending || table.status === 'occupied'}
                    title={table.status === 'occupied' ? 'Cannot remove an occupied table' : undefined}
                >
                    Remove
                </button>
            </div>
        </li>
    )
}
