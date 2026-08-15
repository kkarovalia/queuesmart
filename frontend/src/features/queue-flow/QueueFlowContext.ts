import { createContext } from 'react'
import type {
    ActiveQueueEntry,
    QueueFormData,
    QueueNotification,
} from '../../types/queue'

export type QueueFlowContextValue = {
    activeQueue: ActiveQueueEntry | null
    joinError: string | null
    isJoining: boolean
    notifications: QueueNotification[]
    joinQueue: (queueForm: QueueFormData) => Promise<void>
    leaveQueue: () => Promise<void>
    advanceStatus: () => Promise<void>
    markAllRead: () => void
}

export const QueueFlowContext = createContext<QueueFlowContextValue | null>(null)
