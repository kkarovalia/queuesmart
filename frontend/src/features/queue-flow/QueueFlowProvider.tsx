import { useState, type ReactNode } from 'react'
import { mockServices, mockQueueEntries } from '../../data/mockData'
import { QueueFlowContext } from './QueueFlowContext'
import type {
    ActiveQueueEntry,
    QueueFormData,
    QueueNotification,
    QueueStatus,
} from '../../types/queue'

const nextStatus: Record<QueueStatus, QueueStatus> = {
    waiting: 'almost-ready',
    'almost-ready': 'served',
    served: 'served',
}

const nowLabel = () =>
    new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date())

const createId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}-${crypto.randomUUID()}`
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function QueueFlowProvider({ children }: { children: ReactNode }) {
    const [activeQueue, setActiveQueue] = useState<ActiveQueueEntry | null>(null)
    const [notifications, setNotifications] = useState<QueueNotification[]>([
        {
            id: 'notification-welcome',
            title: 'Welcome to QueueSmart',
            message: 'Open queues and reservations are ready to browse.',
            createdAt: 'Today',
            read: true,
            tone: 'info',
        },
        {
            id: 'notification-reservation',
            title: 'Reservation confirmed',
            message: 'Your table for 4 is confirmed for Sunday at 7:00 PM.',
            createdAt: '7 min ago',
            read: false,
            tone: 'success',
        },
    ])

    const addNotification = (
        title: string,
        message: string,
        tone: QueueNotification['tone'] = 'info',
    ) => {
        setNotifications((currentNotifications) => [
            {
                id: createId('notification'),
                title,
                message,
                createdAt: nowLabel(),
                read: false,
                tone,
            },
            ...currentNotifications,
        ])
    }

    const joinQueue = (queueForm: QueueFormData) => {
        const service = mockServices.find((item) => item.id === queueForm.serviceId)

        if (!service) {
            return
        }

        const queueLength = mockQueueEntries.filter((entry) => entry.serviceId === service.id).length

        setActiveQueue({
            ...queueForm,
            id: createId('queue'),
            serviceName: service.name,
            position: queueLength + 1,
            estimatedWait: service.estimatedWait,
            status: 'waiting',
            joinedAt: nowLabel(),
        })
        addNotification(
            'You joined the waitlist',
            `You joined ${service.name} for a party of ${queueForm.partySize}.`,
            'success',
        )
    }

    const leaveQueue = () => {
        if (activeQueue) {
            addNotification('Queue update', `You left ${activeQueue.serviceName}.`, 'warning')
        }
        setActiveQueue(null)
    }

    const advanceStatus = () => {
        if (!activeQueue || activeQueue.status === 'served') {
            return
        }

        const updatedStatus = nextStatus[activeQueue.status]

        setActiveQueue({
            ...activeQueue,
            status: updatedStatus,
            position: updatedStatus === 'served' ? 0 : activeQueue.position,
            estimatedWait: updatedStatus === 'served' ? 'Ready now' : '10-15 min',
        })

        if (updatedStatus === 'almost-ready') {
            addNotification(
                "You're almost ready",
                'Your table is being prepared. Please stay nearby.',
                'warning',
            )
        }

        if (updatedStatus === 'served') {
            addNotification('Your table is ready', 'Please check in with the host stand.', 'success')
        }
    }

    const value = {
        activeQueue,
        notifications,
        joinQueue,
        leaveQueue,
        advanceStatus,
        markAllRead: () =>
            setNotifications((currentNotifications) =>
                currentNotifications.map((notification) => ({ ...notification, read: true })),
            ),
    }

    return <QueueFlowContext.Provider value={value}>{children}</QueueFlowContext.Provider>
}
