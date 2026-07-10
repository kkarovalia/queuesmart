import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ReservationFormInput, Table } from '../../contracts/types'
import { validateReservationForm } from './validateReservationForm'
import type { ReservationFormValues, ReservationFormErrors } from './validateReservationForm'
import '../service-management/service-form.css'

interface ReservationFormProps {
    mode: 'create' | 'edit'
    initialValues?: ReservationFormInput
    tables: Table[]
    onSubmit: (values: ReservationFormInput) => void
    isSubmitting: boolean
}

const NO_TABLE_PREFERENCE = ''

const DEFAULT_VALUES: ReservationFormValues = {
    customerName: '',
    partySize: '',
    dateTime: '',
    tableId: NO_TABLE_PREFERENCE,
}

function toDatetimeLocalValue(iso: string): string {
    const date = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toFormValues(input?: ReservationFormInput): ReservationFormValues {
    if (!input) return DEFAULT_VALUES
    return {
        customerName: input.customerName,
        partySize: String(input.partySize),
        dateTime: toDatetimeLocalValue(input.dateTime),
        tableId: input.tableId ?? NO_TABLE_PREFERENCE,
    }
}

export function ReservationForm({ mode, initialValues, tables, onSubmit, isSubmitting }: ReservationFormProps) {
    const [values, setValues] = useState<ReservationFormValues>(() => toFormValues(initialValues))
    const [errors, setErrors] = useState<ReservationFormErrors>({})

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const validationErrors = validateReservationForm(values)
        setErrors(validationErrors)
        if (Object.keys(validationErrors).length > 0) {
            return
        }
        onSubmit({
            customerName: values.customerName.trim(),
            partySize: Number(values.partySize),
            dateTime: new Date(values.dateTime).toISOString(),
            tableId: values.tableId === NO_TABLE_PREFERENCE ? null : values.tableId,
        })
    }

    return (
        <form className="service-form" onSubmit={handleSubmit} noValidate>
            <div className="service-form__field">
                <label htmlFor="reservation-customer">Customer Name</label>
                <input
                    id="reservation-customer"
                    type="text"
                    value={values.customerName}
                    onChange={e => setValues(v => ({ ...v, customerName: e.target.value }))}
                />
                {errors.customerName && <p className="service-form__error">{errors.customerName}</p>}
            </div>

            <div className="service-form__field">
                <label htmlFor="reservation-party-size">Party Size</label>
                <input
                    id="reservation-party-size"
                    type="number"
                    min={1}
                    value={values.partySize}
                    onChange={e => setValues(v => ({ ...v, partySize: e.target.value }))}
                />
                {errors.partySize && <p className="service-form__error">{errors.partySize}</p>}
            </div>

            <div className="service-form__field">
                <label htmlFor="reservation-datetime">Date &amp; Time</label>
                <input
                    id="reservation-datetime"
                    type="datetime-local"
                    value={values.dateTime}
                    onChange={e => setValues(v => ({ ...v, dateTime: e.target.value }))}
                />
                {errors.dateTime && <p className="service-form__error">{errors.dateTime}</p>}
            </div>

            <div className="service-form__field">
                <label htmlFor="reservation-table">Preferred Table</label>
                <select
                    id="reservation-table"
                    value={values.tableId}
                    onChange={e => setValues(v => ({ ...v, tableId: e.target.value }))}
                >
                    <option value={NO_TABLE_PREFERENCE}>No preference</option>
                    {tables.map(table => (
                        <option key={table.id} value={table.id}>
                            {table.label} ({table.section}, seats {table.seats})
                        </option>
                    ))}
                </select>
            </div>

            <button type="submit" disabled={isSubmitting}>
                {mode === 'create' ? 'Create reservation' : 'Save changes'}
            </button>
        </form>
    )
}
