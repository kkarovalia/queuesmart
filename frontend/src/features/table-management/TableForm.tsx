import { useState } from 'react'
import type { FormEvent } from 'react'
import type { TableFormInput } from '../../contracts/types'
import { validateTableForm } from './validateTableForm'
import type { TableFormValues, TableFormErrors } from './validateTableForm'
import '../service-management/service-form.css'

interface TableFormProps {
    mode: 'create' | 'edit'
    initialValues?: TableFormInput
    onSubmit: (values: TableFormInput) => void
    isSubmitting: boolean
}

const DEFAULT_VALUES: TableFormValues = {
    label: '',
    seats: '',
    section: '',
}

function toFormValues(input?: TableFormInput): TableFormValues {
    if (!input) return DEFAULT_VALUES
    return {
        label: input.label,
        seats: String(input.seats),
        section: input.section,
    }
}

export function TableForm({ mode, initialValues, onSubmit, isSubmitting }: TableFormProps) {
    const [values, setValues] = useState<TableFormValues>(() => toFormValues(initialValues))
    const [errors, setErrors] = useState<TableFormErrors>({})

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const validationErrors = validateTableForm(values)
        setErrors(validationErrors)
        if (Object.keys(validationErrors).length > 0) {
            return
        }
        onSubmit({
            label: values.label.trim(),
            seats: Number(values.seats),
            section: values.section.trim(),
        })
    }

    return (
        <form className="service-form" onSubmit={handleSubmit} noValidate>
            <div className="service-form__field">
                <label htmlFor="table-label">Table Label</label>
                <input
                    id="table-label"
                    type="text"
                    maxLength={50}
                    value={values.label}
                    onChange={e => setValues(v => ({ ...v, label: e.target.value }))}
                />
                {errors.label && <p className="service-form__error">{errors.label}</p>}
            </div>

            <div className="service-form__field">
                <label htmlFor="table-seats">Seats</label>
                <input
                    id="table-seats"
                    type="number"
                    min={1}
                    value={values.seats}
                    onChange={e => setValues(v => ({ ...v, seats: e.target.value }))}
                />
                {errors.seats && <p className="service-form__error">{errors.seats}</p>}
            </div>

            <div className="service-form__field">
                <label htmlFor="table-section">Section</label>
                <input
                    id="table-section"
                    type="text"
                    placeholder="e.g. Main Floor, Patio, Bar"
                    value={values.section}
                    onChange={e => setValues(v => ({ ...v, section: e.target.value }))}
                />
                {errors.section && <p className="service-form__error">{errors.section}</p>}
            </div>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
                {mode === 'create' ? 'Add table' : 'Save changes'}
            </button>
        </form>
    )
}
