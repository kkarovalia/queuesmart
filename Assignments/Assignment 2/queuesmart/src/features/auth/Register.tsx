import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";

interface FormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function updateField<K extends keyof FormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="auth-card card">
      <h1>Create your account</h1>
      <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>Join QueueSmart today</p>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Full name"
          value={values.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
          error={errors.fullName}
        />
        <Input
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => updateField("email", e.target.value)}
          error={errors.email}
          hint="This will be your username."
        />
        <Input
          label="Password"
          type="password"
          value={values.password}
          onChange={(e) => updateField("password", e.target.value)}
          error={errors.password}
        />
        <Input
          label="Confirm password"
          type="password"
          value={values.confirmPassword}
          onChange={(e) => updateField("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />

        <Button type="submit" style={{ width: "100%", marginTop: 8 }}>
          Create account
        </Button>
      </form>

      <p style={{ marginTop: 16, fontSize: "0.9rem" }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
