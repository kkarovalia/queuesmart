import { createFileRoute } from '@tanstack/react-router'
import { QueueStatusPage } from '../features/queue-status/QueueStatusPage'

export const Route = createFileRoute('/queue-status')({
    component: QueueStatusPage,
})
