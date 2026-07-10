import { useState } from 'react'
import type { FormEvent } from 'react'
import type { PriorityLevel, ServiceFormInput } from '../../contracts/types'
import { validateServiceForm } from './validateServiceForm'
import type { ServiceFormValues, ServiceFormErrors } from './validateServiceForm'
import './service-form.css'

interface ServiceFormProps {
    initialValues: ServiceFormInput
    onSubmit: (values: ServiceFormInput) => void
    isSubmitting: boolean
}

function toFormValues(input: ServiceFormInput): ServiceFormValues {
    return {
        name: input.name,
        description: input.description,
        expectedDurationMinutes: String(input.expectedDurationMinutes),
        priority: input.priority,
    }
}

export function ServiceForm({ initialValues, onSubmit, isSubmitting }: ServiceFormProps) {
    const [values, setValues] = useState<ServiceFormValues>(() => toFormValues(initialValues))
    const [errors, setErrors] = useState<ServiceFormErrors>({})

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const validationErrors = validateServiceForm(values)
        setErrors(validationErrors)
        if (Object.keys(validationErrors).length > 0) {
            return
        }
        onSubmit({
            name: values.name.trim(),
            description: values.description.trim(),
            expectedDurationMinutes: Number(values.expectedDurationMinutes),
            priority: values.priority,
        })
    }

    return (
        <form className="service-form" onSubmit={handleSubmit} noValidate>
            <div className="service-form__field">
                <label htmlFor="service-name">Service Name</label>
                <input
                    id="service-name"
                    type="text"
                    maxLength={100}
                    value={values.name}
                    onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
                />
                {errors.name && <p className="service-form__error">{errors.name}</p>}
            </div>

            <div className="service-form__field">
                <label htmlFor="service-description">Description</label>
                <textarea
                    id="service-description"
                    value={values.description}
                    onChange={e => setValues(v => ({ ...v, description: e.target.value }))}
                />
                {errors.description && <p className="service-form__error">{errors.description}</p>}
            </div>

            <div className="service-form__field">
                <label htmlFor="service-duration">Expected Duration (minutes)</label>
                <input
                    id="service-duration"
                    type="number"
                    min={1}
                    value={values.expectedDurationMinutes}
                    onChange={e => setValues(v => ({ ...v, expectedDurationMinutes: e.target.value }))}
                />
                {errors.expectedDurationMinutes && (
                    <p className="service-form__error">{errors.expectedDurationMinutes}</p>
                )}
            </div>

            <div className="service-form__field">
                <label htmlFor="service-priority">Priority Level</label>
                <select
                    id="service-priority"
                    value={values.priority}
                    onChange={e => setValues(v => ({ ...v, priority: e.target.value as PriorityLevel }))}
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>

            <button type="submit" disabled={isSubmitting}>
                Save changes
            </button>
        </form>
    )
}
