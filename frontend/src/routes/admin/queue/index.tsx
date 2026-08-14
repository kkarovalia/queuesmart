import { createFileRoute } from '@tanstack/react-router'
import { QueueServicePickerPage } from '../../../features/queue-management/QueueServicePickerPage'

export const Route = createFileRoute('/admin/queue/')({
    component: QueueServicePickerPage,
})
