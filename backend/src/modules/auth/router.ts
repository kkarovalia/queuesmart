import { Router } from 'express'
import { users } from '../../data/store.js'
import type { User } from '../../types.js'

export const authRouter = Router()

// TODO(Ian): this is a starting point, not a finished auth module.
// Still needed: real password hashing (e.g. bcrypt) instead of storing it
// plain, and a real session/JWT issued on login instead of just echoing
// the user back. Role handling (user vs admin) is stubbed as always 'user'
// on registration.

authRouter.post('/register', (req, res) => {
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

    if (users.some(user => user.email === email)) {
        res.status(409).json({ error: 'An account with this email already exists' })
        return
    }

    const user: User = {
        id: `user-${users.length + 1}`,
        email,
        passwordHash: password,
        role: 'user',
    }
    users.push(user)

    res.status(201).json({ id: user.id, email: user.email, role: user.role })
})

authRouter.post('/login', (req, res) => {
    const { email, password } = req.body ?? {}

    if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Validation failed', details: ['email and password are required'] })
        return
    }

    const user = users.find(item => item.email === email)
    if (!user || user.passwordHash !== password) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
    }

    res.json({ id: user.id, email: user.email, role: user.role })
})
