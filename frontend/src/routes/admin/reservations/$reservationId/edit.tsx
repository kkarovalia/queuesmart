import { createFileRoute } from '@tanstack/react-router'
import { ReservationFormPage } from '../../../../features/reservation-management/ReservationFormPage'

export const Route = createFileRoute('/admin/reservations/$reservationId/edit')({
    component: RouteComponent,
})

function RouteComponent() {
    const { reservationId } = Route.useParams()
    return <ReservationFormPage mode="edit" reservationId={reservationId} />
}
