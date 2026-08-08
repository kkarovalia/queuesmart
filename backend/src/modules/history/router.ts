import { Router } from 'express'
import { getAllHistory, getHistoryByUserId } from '../../database.js'

export const historyRouter = Router()

// Admin view: every user's history, newest first, with the customer's email
// attached so an admin can tell whose record is whose.
historyRouter.get('/', async (_req, res) => {
    const records = await getAllHistory()
    res.json(records)
})

historyRouter.get('/:userId', async (req, res) => {
    const { userId } = req.params
    const records = await getHistoryByUserId(userId)
    res.json(records)
})
