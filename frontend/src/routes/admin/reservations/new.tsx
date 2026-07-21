import { createFileRoute } from '@tanstack/react-router'
import { ReservationFormPage } from '../../../features/reservation-management/ReservationFormPage'

export const Route = createFileRoute('/admin/reservations/new')({
    component: () => <ReservationFormPage mode="create" />,
})
