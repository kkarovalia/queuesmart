export interface TableFormValues {
    label: string
    seats: string
    section: string
}

export interface TableFormErrors {
    label?: string
    seats?: string
    section?: string
}

export function validateTableForm(values: TableFormValues): TableFormErrors {
    const errors: TableFormErrors = {}

    if (!values.label.trim()) {
        errors.label = 'Table label is required.'
    } else if (values.label.trim().length > 50) {
        errors.label = 'Table label must be 50 characters or fewer.'
    }

    const seats = Number(values.seats)
    if (!values.seats.trim()) {
        errors.seats = 'Seat count is required.'
    } else if (!Number.isInteger(seats) || seats <= 0) {
        errors.seats = 'Seat count must be a positive whole number.'
    }

    if (!values.section.trim()) {
        errors.section = 'Section is required.'
    }

    return errors
}
