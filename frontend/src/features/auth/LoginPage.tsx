import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLogin, type AuthResponse } from '../../api'
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
    } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters.'
    }

    return errors
}

export function LoginPage() {
    const navigate = useNavigate()
    const login = useLogin()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState<FormErrors>({})

    function handleSubmit(event: FormEvent) {
        event.preventDefault()
        const nextErrors = validate(email, password)
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return

        login.mutate({ email, password }, {
            onSuccess: (data: AuthResponse) => {
                navigate({ to: data.role === 'admin' ? '/admin' : '/dashboard' })
            },
        })
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

                {login.isError && <p className="auth-form__error" role="alert">{login.error.message}</p>}

                <button type="submit" className="auth-form__submit" disabled={login.isPending}>
                    {login.isPending ? 'Signing in…' : 'Log in'}
                </button>
            </form>

            <div className="auth-form__divider">demo access</div>
            <button type="button" className="auth-form__admin" onClick={() => navigate({ to: '/admin' })}>
                Continue as restaurant staff
            </button>

            <p className="auth-form__footer">
                Don't have an account? <Link to="/register">Sign up</Link>
            </p>
        </div>
    )
}
