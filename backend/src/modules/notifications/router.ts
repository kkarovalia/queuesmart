import { Router } from 'express'
import {
    createNotificationRecord,
    getNotificationsByUserId,
    markNotificationRead,
} from '../../database.js'
import { requireAuth, type AuthedRequest } from '../../middleware/auth.js'

export const notificationsRouter = Router()

// Core business logic lives in these three functions, kept separate from
// the HTTP handlers below so they can be unit tested directly and so the
// queue module can call them when someone joins a queue or nears the
// front of the line, per the assignment brief.
//
// A4 change: these are now async (they write to the database via
// database.ts), where they used to be synchronous in-memory pushes.
// Callers in the queue module await these so the notification is guaranteed
// to exist by the time the caller's own response is sent.

export async function notifyQueueJoined(userId: string, serviceName: string) {
    return createNotificationRecord(userId, 'queue-joined', `You joined the queue for ${serviceName}.`)
}

export async function notifyAlmostReady(userId: string, serviceName: string) {
    return createNotificationRecord(userId, 'almost-ready', `You're almost up for ${serviceName}. Please be ready.`)
}

export async function notifyServed(userId: string, serviceName: string) {
    return createNotificationRecord(userId, 'served', `You've been served for ${serviceName}. Enjoy!`)
}

// The logged-in user's own notifications. Identity comes solely from the
// JWT (requireAuth sets req.user), never from a client-suppliable URL param.
notificationsRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
    const userNotifications = await getNotificationsByUserId(req.user!.sub)
    res.json(userNotifications)
})

// Marks a single notification as read. Scoped to the caller's own
// notifications — see database.ts's markNotificationRead.
notificationsRouter.post('/:notificationId/read', requireAuth, async (req: AuthedRequest, res) => {
    const { notificationId } = req.params
    const notification = await markNotificationRead(notificationId, req.user!.sub)
    if (!notification) {
        res.status(404).json({ error: 'Notification not found' })
        return
    }
    res.json(notification)
})
