import { createFileRoute } from '@tanstack/react-router'
import { ChatAssistantPage } from '../features/chat-assistant/ChatAssistantPage'

export const Route = createFileRoute('/assistant')({
    component: ChatAssistantPage,
})
