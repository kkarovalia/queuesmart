import { createContext } from 'react'
import type {
    ActiveQueueEntry,
    QueueFormData,
    QueueNotification,
} from '../../types/queue'

export type QueueFlowContextValue = {
    activeQueue: ActiveQueueEntry | null
    notifications: QueueNotification[]
    joinQueue: (queueForm: QueueFormData) => void
    leaveQueue: () => void
    advanceStatus: () => void
    markAllRead: () => void
}

export const QueueFlowContext = createContext<QueueFlowContextValue | null>(null)
