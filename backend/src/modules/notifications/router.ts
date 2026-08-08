import { Router } from 'express'
import {
    createNotificationRecord,
    getNotificationsByUserId,
    markNotificationRead,
} from '../../database.js'

export const notificationsRouter = Router()

// Core business logic lives in these three functions, kept separate from
// the HTTP handlers below so they can be unit tested directly and so the
// queue module can call them when someone joins a queue or nears the
// front of the line, per the assignment brief.
//
// A4 change: these are now async (they write to the database via
// database.ts), where they used to be synchronous in-memory pushes.
// Existing callers in the queue module should await these, but nothing
// breaks if they don't — the notification still gets created, it just
// isn't guaranteed to exist yet at the exact moment the caller's response
// is sent.

export async function notifyQueueJoined(userId: string, serviceName: string) {
    return createNotificationRecord(userId, 'queue-joined', `You joined the queue for ${serviceName}.`)
}

export async function notifyAlmostReady(userId: string, serviceName: string) {
    return createNotificationRecord(userId, 'almost-ready', `You're almost up for ${serviceName}. Please be ready.`)
}

export async function notifyServed(userId: string, serviceName: string) {
    return createNotificationRecord(userId, 'served', `You've been served for ${serviceName}. Enjoy!`)
}

// Returns one user's notifications, newest first.
notificationsRouter.get('/:userId', async (req, res) => {
    const { userId } = req.params
    const userNotifications = await getNotificationsByUserId(userId)
    res.json(userNotifications)
})

// Marks a single notification as read. Used by the frontend when a user
// opens/views their notifications.
notificationsRouter.post('/:notificationId/read', async (req, res) => {
    const { notificationId } = req.params
    const notification = await markNotificationRead(notificationId)
    if (!notification) {
        res.status(404).json({ error: 'Notification not found' })
        return
    }
    res.json(notification)
})
