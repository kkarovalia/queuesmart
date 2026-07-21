import { Link } from '@tanstack/react-router'
import { useReservations, useTables } from '../../api'
import { ReservationListItem } from './ReservationListItem'
import '../admin-dashboard/admin-dashboard.css'

export function ReservationManagementPage() {
    const reservationsQuery = useReservations()
    const tablesQuery = useTables()

    return (
        <section className="admin-dashboard page">
            <div className="admin-dashboard__header">
                <h1>Reservation Management</h1>
                <Link to="/admin/reservations/new" className="primary-button">
                    New reservation
                </Link>
            </div>

            {reservationsQuery.isLoading && <p>Loading reservations...</p>}
            {reservationsQuery.isError && (
                <p role="alert">Failed to load reservations: {reservationsQuery.error.message}</p>
            )}

            {reservationsQuery.data && (
                <ul className="admin-dashboard__list panel">
                    {reservationsQuery.data.map(reservation => (
                        <ReservationListItem
                            key={reservation.id}
                            reservation={reservation}
                            table={tablesQuery.data?.find(t => t.id === reservation.tableId)}
                        />
                    ))}
                </ul>
            )}
        </section>
    )
}
