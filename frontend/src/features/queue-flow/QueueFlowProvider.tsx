import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    ACTIVE_QUEUE_QUERY_KEY,
    useServices,
    useNotifications,
    useMarkNotificationRead,
    joinQueue as joinQueueRequest,
    leaveQueue as leaveQueueRequest,
    fetchEntryWaitStatus,
    useActiveQueue,
    useUser,
} from '../../api'
import { QueueFlowContext } from './QueueFlowContext'
import type { ActiveQueueEntry, QueueFormData } from '../../types/queue'

const timeLabel = (value: Date | string = new Date()) =>
    new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value))

function formatWait(minutes: number): string {
    return minutes <= 0 ? 'Ready now' : `${minutes} min`
}

export function QueueFlowProvider({ children }: { children: ReactNode }) {
    const [activeQueue, setActiveQueue] = useState<ActiveQueueEntry | null>(null)
    const [joinError, setJoinError] = useState<string | null>(null)
    const [isJoining, setIsJoining] = useState(false)
    const userQuery = useUser()
    const servicesQuery = useServices()
    const activeQueueQuery = useActiveQueue(Boolean(userQuery.data))
    const notificationsQuery = useNotifications(Boolean(userQuery.data))
    const markNotificationRead = useMarkNotificationRead()
    const queryClient = useQueryClient()
    const userEmail = userQuery.data?.email

    useEffect(() => {
        let cancelled = false
        const hydrateActiveQueue = async () => {
            if (!userEmail) {
                await Promise.resolve()
                if (!cancelled) setActiveQueue(null)
                return
            }

            const entry = activeQueueQuery.data
            if (entry === undefined || !servicesQuery.data) return
            if (entry === null) {
                await Promise.resolve()
                if (!cancelled) setActiveQueue(null)
                return
            }

            const service = servicesQuery.data.find(item => item.id === entry.serviceId)
            if (!service) return
            const waitStatus = await fetchEntryWaitStatus(entry.serviceId, entry.id).catch(() => null)
            if (cancelled) return
            setActiveQueue({
                id: entry.id,
                serviceId: entry.serviceId,
                serviceName: service.name,
                partySize: entry.partySize,
                tablePreference: service.tablePreferenceLabel,
                position: waitStatus?.position ?? entry.position ?? 1,
                estimatedWait: waitStatus ? formatWait(waitStatus.estimatedWaitMinutes) : 'Calculating...',
                status: entry.status === 'almost-ready' ? 'almost-ready' : 'waiting',
                joinedAt: timeLabel(entry.joinedAt),
            })
        }

        void hydrateActiveQueue()

        return () => {
            cancelled = true
        }
    }, [activeQueueQuery.data, servicesQuery.data, userEmail])

    const joinQueue = async (queueForm: QueueFormData) => {
        setJoinError(null)
        const service = servicesQuery.data?.find((item) => item.id === queueForm.serviceId)
        if (!service || !userQuery.data) {
            setJoinError('Unable to verify this queue right now. Please refresh and try again.')
            return
        }

        setIsJoining(true)
        try {
            const entry = await joinQueueRequest({
                serviceId: queueForm.serviceId,
                partySize: queueForm.partySize,
            })
            // Joining creates a notification server-side; without this the UI
            // wouldn't see it until the notifications query's staleTime lapses.
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ACTIVE_QUEUE_QUERY_KEY })
            queryClient.invalidateQueries({ queryKey: ['services'] })
            queryClient.invalidateQueries({ queryKey: ['queueLengths'] })

            const waitStatus = await fetchEntryWaitStatus(queueForm.serviceId, entry.id).catch(() => null)

            setActiveQueue({
                ...queueForm,
                id: entry.id,
                serviceName: service.name,
                position: entry.position ?? 1,
                estimatedWait: waitStatus ? formatWait(waitStatus.estimatedWaitMinutes) : 'Calculating...',
                status: entry.status === 'served' ? 'served' : entry.status === 'almost-ready' ? 'almost-ready' : 'waiting',
                joinedAt: timeLabel(),
            })
        } catch (error) {
            setJoinError(error instanceof Error ? error.message : 'Unable to join this waitlist. Please try again.')
            queryClient.invalidateQueries({ queryKey: ACTIVE_QUEUE_QUERY_KEY })
        } finally {
            setIsJoining(false)
        }
    }

    const leaveQueue = async () => {
        if (!activeQueue) {
            return
        }
        await leaveQueueRequest({ serviceId: activeQueue.serviceId })
        setActiveQueue(null)
        setJoinError(null)
        queryClient.setQueryData(ACTIVE_QUEUE_QUERY_KEY, null)
        queryClient.invalidateQueries({ queryKey: ['services'] })
        queryClient.invalidateQueries({ queryKey: ['queueLengths'] })
        queryClient.invalidateQueries({ queryKey: ['waitlistHistory'] })
        queryClient.invalidateQueries({ queryKey: ['allHistory'] })
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
        queryClient.invalidateQueries({ queryKey: ['notifications'] })

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
        joinError,
        isJoining,
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
