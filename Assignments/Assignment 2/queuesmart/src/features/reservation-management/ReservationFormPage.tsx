import { useNavigate } from '@tanstack/react-router'
import type { ReservationFormInput } from '../../contracts/types'
import { useCreateReservation, useUpdateReservation, useReservation, useTables } from '../../api'
import { ReservationForm } from './ReservationForm'

interface CreateModeProps {
    mode: 'create'
}

interface EditModeProps {
    mode: 'edit'
    reservationId: string
}

type ReservationFormPageProps = CreateModeProps | EditModeProps

export function ReservationFormPage(props: ReservationFormPageProps) {
    if (props.mode === 'edit') {
        return <EditReservationFormPage reservationId={props.reservationId} />
    }
    return <CreateReservationFormPage />
}

function CreateReservationFormPage() {
    const navigate = useNavigate()
    const tablesQuery = useTables()
    const createReservation = useCreateReservation()

    function handleSubmit(values: ReservationFormInput) {
        createReservation.mutate(values, {
            onSuccess: () => navigate({ to: '/admin/reservations' }),
        })
    }

    return (
        <div>
            <h1>Create Reservation</h1>
            {tablesQuery.data && (
                <ReservationForm
                    mode="create"
                    tables={tablesQuery.data}
                    onSubmit={handleSubmit}
                    isSubmitting={createReservation.isPending}
                />
            )}
        </div>
    )
}

function EditReservationFormPage({ reservationId }: { reservationId: string }) {
    const navigate = useNavigate()
    const reservationQuery = useReservation(reservationId)
    const tablesQuery = useTables()
    const updateReservation = useUpdateReservation()

    function handleSubmit(values: ReservationFormInput) {
        updateReservation.mutate(
            { id: reservationId, input: values },
            { onSuccess: () => navigate({ to: '/admin/reservations' }) },
        )
    }

    if (reservationQuery.isLoading || tablesQuery.isLoading) {
        return <p>Loading reservation...</p>
    }

    if (reservationQuery.isError) {
        return <p role="alert">Failed to load reservation: {reservationQuery.error.message}</p>
    }

    if (!reservationQuery.data || !tablesQuery.data) {
        return <p role="alert">Reservation not found.</p>
    }

    return (
        <div>
            <h1>Edit Reservation</h1>
            <ReservationForm
                mode="edit"
                initialValues={reservationQuery.data}
                tables={tablesQuery.data}
                onSubmit={handleSubmit}
                isSubmitting={updateReservation.isPending}
            />
        </div>
    )
}
