import { Router } from 'express'
import { notifications } from '../../data/store.js'

export const notificationsRouter = Router()

// TODO(Nelson): this is a starting point, not a finished module.
// Nothing creates notifications yet - the idea is the queue module calls
// into a helper here (e.g. notifyQueueJoined(userId), notifyAlmostReady(userId))
// when someone joins/nears the front of the line, per the assignment brief.
// This currently only exposes a read endpoint over whatever's in the store.

notificationsRouter.get('/:userId', (req, res) => {
    const { userId } = req.params
    res.json(notifications.filter(note => note.userId === userId))
})
