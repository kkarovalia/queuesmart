import * as argon2 from "argon2";
import { Router } from 'express'
import { createUser, EmailAlreadyRegisteredError, getUserByEmail, getUserById } from "../../database.js";
import { requireAuth, signToken, type AuthedRequest } from "../../middleware/auth.js";

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
    const { email, password } = req.body ?? {}
    const errors: string[] = []

    if (typeof email !== 'string' || !email.trim()) {
        errors.push('email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('email must be a valid email address')
    }

    if (typeof password !== 'string' || password.length < 8) {
        errors.push('password is required and must be at least 8 characters')
    }

    if (errors.length > 0) {
        res.status(400).json({ error: 'Validation failed', details: errors })
        return
    }

    if (await getUserByEmail(email)) {
        res.status(409).json({ error: 'An account with this email already exists' })
        return
    }

    const passwordHash = await argon2.hash(password)

    let user
    try {
        user = await createUser({ email, passwordHash, role: 'user' })
    } catch (error) {
        if (error instanceof EmailAlreadyRegisteredError) {
            // Two registrations for the same email raced past the check
            // above; the database's unique index is the actual source of
            // truth here.
            res.status(409).json({ error: 'An account with this email already exists' })
            return
        }
        throw error
    }

    const token = signToken({ sub: user.id, role: user.role })
    res.status(201).json({ token, id: user.id, email: user.email, role: user.role })
})

authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {}

    if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Validation failed', details: ['email and password are required'] })
        return
    }

    const user = await getUserByEmail(email)

    if (!user || !(await argon2.verify(user.passwordHash, password))) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
    }

    const token = signToken({ sub: user.id, role: user.role })
    res.json({ token, id: user.id, email: user.email, role: user.role })
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.user ? await getUserById(req.user.sub) : undefined
    if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
    }
    res.json({ id: user.id, email: user.email, role: user.role })
})