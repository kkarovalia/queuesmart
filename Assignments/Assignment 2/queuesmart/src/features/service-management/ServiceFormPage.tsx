import { useNavigate } from '@tanstack/react-router'
import type { ServiceFormInput } from '../../contracts/types'
import { useUpdateService, useService } from '../../api'
import { ServiceForm } from './ServiceForm'

interface ServiceFormPageProps {
    serviceId: string
}

export function ServiceFormPage({ serviceId }: ServiceFormPageProps) {
    const navigate = useNavigate()
    const serviceQuery = useService(serviceId)
    const updateService = useUpdateService()

    function handleSubmit(values: ServiceFormInput) {
        updateService.mutate(
            { id: serviceId, input: values },
            { onSuccess: () => navigate({ to: '/admin' }) },
        )
    }

    if (serviceQuery.isLoading) {
        return <p>Loading service...</p>
    }

    if (serviceQuery.isError) {
        return <p role="alert">Failed to load service: {serviceQuery.error.message}</p>
    }

    if (!serviceQuery.data) {
        return <p role="alert">Service not found.</p>
    }

    return (
        <div>
            <h1>Edit Service</h1>
            <ServiceForm
                initialValues={serviceQuery.data}
                onSubmit={handleSubmit}
                isSubmitting={updateService.isPending}
            />
        </div>
    )
}
