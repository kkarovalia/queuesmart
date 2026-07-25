import { Router } from 'express'
import { notifications } from '../../data/store.js'
import type { AppNotification, NotificationKind } from '../../types.js'

export const notificationsRouter = Router()

// Core business logic lives in these three functions, kept separate from
// the HTTP handlers below so they can be unit tested directly and so the
// queue module can call them when someone joins a queue or nears the
// front of the line, per the assignment brief.

function createNotification(userId: string, kind: NotificationKind, message: string): AppNotification {
    const notification: AppNotification = {
        id: `n-${notifications.length + 1}`,
        userId,
        kind,
        message,
        createdAt: new Date().toISOString(),
        read: false,
    }
    notifications.push(notification)
    return notification
}

export function notifyQueueJoined(userId: string, serviceName: string): AppNotification {
    return createNotification(userId, 'queue-joined', `You joined the queue for ${serviceName}.`)
}

export function notifyAlmostReady(userId: string, serviceName: string): AppNotification {
    return createNotification(userId, 'almost-ready', `You're almost up for ${serviceName}. Please be ready.`)
}

export function notifyServed(userId: string, serviceName: string): AppNotification {
    return createNotification(userId, 'served', `You've been served for ${serviceName}. Enjoy!`)
}

// Returns one user's notifications, newest first.
notificationsRouter.get('/:userId', (req, res) => {
    const { userId } = req.params
    const userNotifications = notifications
        .filter(note => note.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    res.json(userNotifications)
})

// Marks a single notification as read. Used by the frontend when a user
// opens/views their notifications.
notificationsRouter.post('/:notificationId/read', (req, res) => {
    const { notificationId } = req.params
    const notification = notifications.find(note => note.id === notificationId)
    if (!notification) {
        res.status(404).json({ error: 'Notification not found' })
        return
    }
    notification.read = true
    res.json(notification)
})
