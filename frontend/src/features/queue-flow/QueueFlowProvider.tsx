import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    useServices,
    useNotifications,
    useMarkNotificationRead,
    joinQueue as joinQueueRequest,
    leaveQueue as leaveQueueRequest,
    fetchEntryWaitStatus,
    useUser,
} from '../../api'
import { QueueFlowContext } from './QueueFlowContext'
import type { ActiveQueueEntry, QueueFormData } from '../../types/queue'

const nowLabel = () =>
    new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date())

function formatWait(minutes: number): string {
    return minutes <= 0 ? 'Ready now' : `${minutes} min`
}

export function QueueFlowProvider({ children }: { children: ReactNode }) {
    const [activeQueue, setActiveQueue] = useState<ActiveQueueEntry | null>(null)
    const userQuery = useUser()
    const userId = userQuery.data?.id
    const servicesQuery = useServices()
    const notificationsQuery = useNotifications(userId)
    const markNotificationRead = useMarkNotificationRead()
    const queryClient = useQueryClient()

    const joinQueue = async (queueForm: QueueFormData) => {
        const service = servicesQuery.data?.find((item) => item.id === queueForm.serviceId)
        if (!service || !userId) {
            return
        }

        const entry = await joinQueueRequest({
            serviceId: queueForm.serviceId,
            partySize: queueForm.partySize,
        })
        // Joining creates a notification server-side; without this the UI
        // wouldn't see it until the notifications query's staleTime lapses.
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] })

        const waitStatus = await fetchEntryWaitStatus(queueForm.serviceId, entry.id)

        setActiveQueue({
            ...queueForm,
            id: entry.id,
            serviceName: service.name,
            position: entry.position ?? 1,
            estimatedWait: waitStatus ? formatWait(waitStatus.estimatedWaitMinutes) : 'Calculating...',
            status: entry.status === 'served' ? 'served' : entry.status === 'almost-ready' ? 'almost-ready' : 'waiting',
            joinedAt: nowLabel(),
        })
    }

    const leaveQueue = async () => {
        if (!activeQueue) {
            return
        }
        await leaveQueueRequest({ serviceId: activeQueue.serviceId })
        setActiveQueue(null)
    }

    // Re-checks the real queue state from the backend. Renamed conceptually
    // from "advance" (used to just simulate the next step locally) to a real
    // refresh, since only an admin's serve-next actually changes anyone's
    // status now.
    const advanceStatus = async () => {
        if (!activeQueue || activeQueue.status === 'served') {
            return
        }

        const waitStatus = await fetchEntryWaitStatus(activeQueue.serviceId, activeQueue.id)
        // A status change here (promoted to almost-ready, or served) means an
        // admin action created a notification for this user server-side.
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] })

        if (!waitStatus) {
            // No longer in the active queue and we didn't leave voluntarily, so
            // the only other way out is being served.
            setActiveQueue({ ...activeQueue, status: 'served', position: 0, estimatedWait: 'Ready now' })
            return
        }

        setActiveQueue({
            ...activeQueue,
            position: waitStatus.position,
            estimatedWait: formatWait(waitStatus.estimatedWaitMinutes),
            status: waitStatus.position === 1 ? 'almost-ready' : 'waiting',
        })
    }

    const value = {
        activeQueue,
        notifications: notificationsQuery.data ?? [],
        joinQueue,
        leaveQueue,
        advanceStatus,
        markAllRead: () => {
            for (const notification of notificationsQuery.data ?? []) {
                if (!notification.read) {
                    markNotificationRead.mutate(notification.id)
                }
            }
        },
    }

    return <QueueFlowContext.Provider value={value}>{children}</QueueFlowContext.Provider>
}
