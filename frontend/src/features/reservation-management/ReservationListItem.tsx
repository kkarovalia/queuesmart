import { Link } from '@tanstack/react-router'
import type { Reservation, Table } from '../../contracts/types'
import { StatusBadge } from '../../ui/StatusBadge'
import { useCancelReservation } from '../../api'

interface ReservationListItemProps {
    reservation: Reservation
    table: Table | undefined
}

export function ReservationListItem({ reservation, table }: ReservationListItemProps) {
    const cancelReservation = useCancelReservation()
    const isCancellable = reservation.status === 'confirmed'

    const formattedDateTime = new Date(reservation.dateTime).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    return (
        <li className="service-list-item management-list-item">
            <div className="service-list-item__info">
                <div className="service-list-item__heading">
                    <span className="service-list-item__name">{reservation.customerName}</span>
                    <StatusBadge kind="reservationStatus" value={reservation.status} />
                </div>
                <p className="service-list-item__description">
                    Party of {reservation.partySize} &middot; {formattedDateTime}
                    {table && <> &middot; {table.label} ({table.section})</>}
                    {!table && <> &middot; No table assigned</>}
                </p>
            </div>
            <div className="management-list-item__actions">
                <Link className="secondary-button" to="/admin/reservations/$reservationId/edit" params={{ reservationId: reservation.id }}>
                    Edit
                </Link>
                <button className="danger-button"
                    type="button"
                    onClick={() => cancelReservation.mutate(reservation.id)}
                    disabled={!isCancellable || cancelReservation.isPending}
                >
                    Cancel
                </button>
            </div>
        </li>
    )
}
