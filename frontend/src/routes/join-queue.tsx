import { createFileRoute } from '@tanstack/react-router'
import { JoinQueuePage } from '../features/join-queue/JoinQueuePage'

export const Route = createFileRoute('/join-queue')({
    component: JoinQueuePage,
})
