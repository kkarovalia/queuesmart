import { useNavigate } from '@tanstack/react-router'
import type { ServiceFormInput } from '../../contracts/types'
import { useCreateService } from '../../api'
import { ServiceForm } from './ServiceForm'

const emptyService: ServiceFormInput = { name: '', description: '', expectedDurationMinutes: 30, priority: 'medium' }

export function CreateServicePage() {
    const navigate = useNavigate()
    const createService = useCreateService()

    function handleSubmit(values: ServiceFormInput) {
        createService.mutate(values, { onSuccess: () => navigate({ to: '/admin' }) })
    }

    return <section className="page"><header className="page-header"><div><h1>Create Service</h1><p>Add a new restaurant queue.</p></div></header>
        {createService.isError && <p role="alert">Failed to create service: {createService.error.message}</p>}
        <ServiceForm initialValues={emptyService} onSubmit={handleSubmit} isSubmitting={createService.isPending} submitLabel="Create service" /></section>
}
