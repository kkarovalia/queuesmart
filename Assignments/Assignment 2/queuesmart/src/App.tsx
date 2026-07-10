import { Link, Outlet } from "@tanstack/react-router";
import { useUser } from "./api";

const userLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/join-queue", label: "Join Queue" },
  { to: "/queue-status", label: "Queue Status" },
  { to: "/history", label: "History" },
  { to: "/notifications", label: "Notifications" },
];

const adminLinks = [
  { to: "/admin/dashboard", label: "Admin Dashboard" },
  { to: "/admin/services", label: "Service Management" },
  { to: "/admin/queue", label: "Queue Management" },
];

export function App() {
  const userQuery = useUser();
  const user = userQuery.data;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">QueueSmart</div>
        <div className="header-right">
          {/* Mock auth always returns a "logged in" user (see api.ts),
              so there's no real logged-out state to branch on yet.
              This link is static for A2 - always visible, always
              points to /login - rather than pretending to be
              conditional on auth state that doesn't really exist.
              Revisit once real auth (A3) has a true logged-out state. */}
          <Link to="/login" className="header-link">Log in</Link>
          <div className="user-pill">{user ? user.name : "..."}</div>
        </div>
      </header>

      <div className="app-body">
        <nav className="app-nav">
          <div className="nav-group-label">User</div>
          {userLinks.map((link) => (
            <Link key={link.to} to={link.to} className="nav-link" activeProps={{ className: "nav-link active" }}>
              {link.label}
            </Link>
          ))}

          {}
          {user?.admin && (
            <>
              <div className="nav-group-label">Admin</div>
              {adminLinks.map((link) => (
                <Link key={link.to} to={link.to} className="nav-link" activeProps={{ className: "nav-link active" }}>
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <main className="app-main">
          {}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
