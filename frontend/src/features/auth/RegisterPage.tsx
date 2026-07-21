import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import './auth.css'

interface FormValues {
    fullName: string
    email: string
    password: string
    confirmPassword: string
}

interface FormErrors {
    fullName?: string
    email?: string
    password?: string
    confirmPassword?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values: FormValues): FormErrors {
    const errors: FormErrors = {}

    if (!values.fullName.trim()) {
        errors.fullName = 'Full name is required.'
    }

    if (!values.email.trim()) {
        errors.email = 'Email is required.'
    } else if (!EMAIL_PATTERN.test(values.email)) {
        errors.email = 'Enter a valid email address.'
    }

    if (!values.password) {
        errors.password = 'Password is required.'
    } else if (values.password.length < 6) {
        errors.password = 'Password must be at least 6 characters.'
    }

    if (values.confirmPassword !== values.password) {
        errors.confirmPassword = 'Passwords do not match.'
    }

    return errors
}

export function RegisterPage() {
    const navigate = useNavigate()
    const [values, setValues] = useState<FormValues>({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    })
    const [errors, setErrors] = useState<FormErrors>({})

    function updateField<K extends keyof FormValues>(key: K, value: string) {
        setValues((prev) => ({ ...prev, [key]: value }))
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault()
        const nextErrors = validate(values)
        setErrors(nextErrors)

        if (Object.keys(nextErrors).length === 0) {
            navigate({ to: '/dashboard' })
        }
    }

    return (
        <div className="auth-form">
            <h1>Create your account</h1>
            <p className="auth-form__subtitle">Join QueueSmart today</p>

            <form onSubmit={handleSubmit} noValidate>
                <div className="auth-form__field">
                    <label htmlFor="register-name">Full name</label>
                    <input
                        id="register-name"
                        value={values.fullName}
                        onChange={(e) => updateField('fullName', e.target.value)}
                        className={errors.fullName ? 'auth-form__input auth-form__input--error' : 'auth-form__input'}
                    />
                    {errors.fullName && <span className="auth-form__error">{errors.fullName}</span>}
                </div>

                <div className="auth-form__field">
                    <label htmlFor="register-email">Email</label>
                    <input
                        id="register-email"
                        type="email"
                        value={values.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className={errors.email ? 'auth-form__input auth-form__input--error' : 'auth-form__input'}
                    />
                    {errors.email && <span className="auth-form__error">{errors.email}</span>}
                    {!errors.email && <span className="auth-form__hint">This will be your username.</span>}
                </div>

                <div className="auth-form__field">
                    <label htmlFor="register-password">Password</label>
                    <input
                        id="register-password"
                        type="password"
                        value={values.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        className={errors.password ? 'auth-form__input auth-form__input--error' : 'auth-form__input'}
                    />
                    {errors.password && <span className="auth-form__error">{errors.password}</span>}
                </div>

                <div className="auth-form__field">
                    <label htmlFor="register-confirm">Confirm password</label>
                    <input
                        id="register-confirm"
                        type="password"
                        value={values.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        className={errors.confirmPassword ? 'auth-form__input auth-form__input--error' : 'auth-form__input'}
                    />
                    {errors.confirmPassword && <span className="auth-form__error">{errors.confirmPassword}</span>}
                </div>

                <button type="submit" className="auth-form__submit">Create account</button>
            </form>

            <p className="auth-form__footer">
                Already have an account? <Link to="/login">Log in</Link>
            </p>
        </div>
    )
}
