import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import './auth.css'

interface FormErrors {
    email?: string
    password?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email: string, password: string): FormErrors {
    const errors: FormErrors = {}

    if (!email.trim()) {
        errors.email = 'Email is required.'
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = 'Enter a valid email address.'
    }

    if (!password) {
        errors.password = 'Password is required.'
    } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters.'
    }

    return errors
}

export function LoginPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState<FormErrors>({})

    function handleSubmit(event: FormEvent) {
        event.preventDefault()
        const nextErrors = validate(email, password)
        setErrors(nextErrors)

        if (Object.keys(nextErrors).length === 0) {
            navigate({ to: '/dashboard' })
        }
    }

    return (
        <div className="auth-form">
            <h1>Welcome back</h1>
            <p className="auth-form__subtitle">Sign in to continue</p>

            <form onSubmit={handleSubmit} noValidate>
                <div className="auth-form__field">
                    <label htmlFor="login-email">Email</label>
                    <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={errors.email ? 'auth-form__input auth-form__input--error' : 'auth-form__input'}
                    />
                    {errors.email && <span className="auth-form__error">{errors.email}</span>}
                </div>

                <div className="auth-form__field">
                    <label htmlFor="login-password">Password</label>
                    <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                        className={errors.password ? 'auth-form__input auth-form__input--error' : 'auth-form__input'}
                    />
                    {errors.password && <span className="auth-form__error">{errors.password}</span>}
                </div>

                <button type="submit" className="auth-form__submit">Log in</button>
            </form>

            <p className="auth-form__footer">
                Don't have an account? <Link to="/register">Sign up</Link>
            </p>
        </div>
    )
}
