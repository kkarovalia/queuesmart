import { Outlet } from "@tanstack/react-router";

export function AuthLayout() {
  return (
    <div className="auth-page">
      <Outlet />
    </div>
  );
}
