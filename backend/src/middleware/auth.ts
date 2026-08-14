import type { NextFunction, Request, Response } from 'express'
import type { UserRole } from '../types.js'
import jwt from 'jsonwebtoken'

export interface AuthPayload {
    sub: string
    role: UserRole
}

export interface AuthedRequest extends Request {
    user?: AuthPayload
}

const JWT_EXPIRES_IN = '8h'

export function signToken(payload: AuthPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null

    if (!token) {
        res.status(401).json({ error: 'Not authenticated' })
        return
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }) as AuthPayload
        next()
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' })
    }
}

export function requireRole(role: UserRole) {
    return (req: AuthedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' })
            return
        }
        if (req.user.role !== role) {
            res.status(403).json({ error: 'Insufficient permissions' })
            return
        }
        next()
    }
}