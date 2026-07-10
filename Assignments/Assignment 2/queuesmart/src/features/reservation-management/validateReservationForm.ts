export interface ReservationFormValues {
    customerName: string
    partySize: string
    dateTime: string
    tableId: string
}

export interface ReservationFormErrors {
    customerName?: string
    partySize?: string
    dateTime?: string
}

export function validateReservationForm(values: ReservationFormValues): ReservationFormErrors {
    const errors: ReservationFormErrors = {}

    if (!values.customerName.trim()) {
        errors.customerName = 'Customer name is required.'
    }

    const partySize = Number(values.partySize)
    if (!values.partySize.trim()) {
        errors.partySize = 'Party size is required.'
    } else if (!Number.isInteger(partySize) || partySize <= 0) {
        errors.partySize = 'Party size must be a positive whole number.'
    }

    if (!values.dateTime.trim()) {
        errors.dateTime = 'Date and time are required.'
    } else if (Number.isNaN(new Date(values.dateTime).getTime())) {
        errors.dateTime = 'Date and time are invalid.'
    }

    return errors
}
