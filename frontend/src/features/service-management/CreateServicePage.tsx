import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ServiceFormInput } from '../../contracts/types'
import { ServiceForm } from './ServiceForm'

const emptyService: ServiceFormInput = { name: '', description: '', expectedDurationMinutes: 30, priority: 'medium' }

export function CreateServicePage() {
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false)
    function createService() {
        setSaving(true)
        window.setTimeout(() => navigate({ to: '/admin' }), 250)
    }
    return <section className="page"><header className="page-header"><div><h1>Create Service</h1><p>Add a mocked restaurant queue for Assignment 2.</p></div></header><ServiceForm initialValues={emptyService} onSubmit={createService} isSubmitting={saving} submitLabel="Create service" /></section>
}
