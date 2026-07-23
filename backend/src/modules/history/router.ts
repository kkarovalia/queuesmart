import { Router } from 'express'
import { historyRecords, users } from '../../data/store.js'

export const historyRouter = Router()

// Admin view: every user's history, newest first, with the customer's email
// attached so an admin can tell whose record is whose.
historyRouter.get('/', (_req, res) => {
    const records = historyRecords
        .map(record => ({
            ...record,
            customerEmail: users.find(user => user.id === record.userId)?.email ?? 'unknown',
        }))
        .sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt))
    res.json(records)
})

historyRouter.get('/:userId', (req, res) => {
    const { userId } = req.params
    const records = historyRecords
        .filter(record => record.userId === userId)
        .sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt))
    res.json(records)
})
