import { createFileRoute } from '@tanstack/react-router'
import { CreateServicePage } from '../../../features/service-management/CreateServicePage'

export const Route = createFileRoute('/admin/services/new')({ component: CreateServicePage })
