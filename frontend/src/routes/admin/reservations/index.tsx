import { createFileRoute } from '@tanstack/react-router'
import { ReservationManagementPage } from '../../../features/reservation-management/ReservationManagementPage'

export const Route = createFileRoute('/admin/reservations/')({
    component: ReservationManagementPage,
})
