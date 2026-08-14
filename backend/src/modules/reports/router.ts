import { Router, type Request, type Response } from 'express'
import { stringify } from 'csv-stringify/sync'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import {
    getUserParticipationReport,
    getServiceActivityReport,
    getUsageSummaryReport,
    type ReportDateRange,
} from '../../database.js'

export const reportsRouter = Router()

// Every report is Administrator-only, per the assignment brief.
reportsRouter.use(requireAuth, requireRole('admin'))

interface ParsedRangeOk {
    range: ReportDateRange
    error?: undefined
}
interface ParsedRangeError {
    range?: undefined
    error: string
}

// ?from=&to= are optional ISO date strings; an empty range means "all time".
function parseDateRange(req: Request): ParsedRangeOk | ParsedRangeError {
    const { from, to } = req.query
    const range: ReportDateRange = {}

    if (typeof from === 'string' && from.length > 0) {
        const parsed = new Date(from)
        if (Number.isNaN(parsed.getTime())) return { error: 'from must be a valid date' }
        range.from = parsed
    }
    if (typeof to === 'string' && to.length > 0) {
        const parsed = new Date(to)
        if (Number.isNaN(parsed.getTime())) return { error: 'to must be a valid date' }
        range.to = parsed
    }

    return { range }
}

function serviceIdFilter(req: Request): string | undefined {
    const { serviceId } = req.query
    return typeof serviceId === 'string' && serviceId.length > 0 ? serviceId : undefined
}

// Sends rows as JSON, or as a downloadable CSV when ?format=csv is set.
// `rows` is always an array here — csv-stringify needs one to infer a header
// row from, so the summary endpoint below wraps its single object in one.
function respond(req: Request, res: Response, rows: object[], filename: string): void {
    if (req.query.format === 'csv') {
        const csv = stringify(rows, { header: true })
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
        res.send(csv)
        return
    }
    res.json(rows)
}

// GET /api/reports/users — queue participation history, one row per
// resolved (served/left) queue entry, across all users by default.
reportsRouter.get('/users', async (req, res, next) => {
    try {
        const parsed = parseDateRange(req)
        if (parsed.error) {
            res.status(400).json({ error: parsed.error })
            return
        }
        const rows = await getUserParticipationReport(parsed.range, serviceIdFilter(req))
        respond(req, res, rows, 'user-participation-report')
    } catch (error) {
        next(error)
    }
})

// GET /api/reports/services — one row per service: current status/priority
// plus queue activity and outcome breakdown within the date range.
reportsRouter.get('/services', async (req, res, next) => {
    try {
        const parsed = parseDateRange(req)
        if (parsed.error) {
            res.status(400).json({ error: parsed.error })
            return
        }
        const rows = await getServiceActivityReport(parsed.range, serviceIdFilter(req))
        respond(req, res, rows, 'service-activity-report')
    } catch (error) {
        next(error)
    }
})

// GET /api/reports/summary — single system-wide usage snapshot (built on
// top of the services report rather than re-querying, see database.ts).
reportsRouter.get('/summary', async (req, res, next) => {
    try {
        const parsed = parseDateRange(req)
        if (parsed.error) {
            res.status(400).json({ error: parsed.error })
            return
        }
        const summary = await getUsageSummaryReport(parsed.range)
        if (req.query.format === 'csv') {
            respond(req, res, [summary], 'usage-summary-report')
            return
        }
        res.json(summary)
    } catch (error) {
        next(error)
    }
})
