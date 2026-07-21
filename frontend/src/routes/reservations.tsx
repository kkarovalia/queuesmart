import { createFileRoute } from '@tanstack/react-router'
import { CustomerReservationsPage } from '../features/customer-reservations/CustomerReservationsPage'

export const Route = createFileRoute('/reservations')({ component: CustomerReservationsPage })
