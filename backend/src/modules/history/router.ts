import { Router } from 'express'
import { getAllHistory, getHistoryByUserId } from '../../database.js'
import { requireAuth, requireRole, type AuthedRequest } from '../../middleware/auth.js'

export const historyRouter = Router()

// Admin view: every user's history, newest first, with the customer's email
// attached so an admin can tell whose record is whose.
historyRouter.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
    const records = await getAllHistory()
    res.json(records)
})

// The logged-in user's own history. Identity comes solely from the JWT
// (requireAuth sets req.user), never from a client-suppliable URL param —
// otherwise any authenticated user could read anyone else's history just by
// changing the id in the URL.
historyRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
    const records = await getHistoryByUserId(req.user!.sub)
    res.json(records)
})
