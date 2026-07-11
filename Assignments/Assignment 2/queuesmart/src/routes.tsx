import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { App } from "./App";
import { AuthLayout } from "./layout/AuthLayout";
import { Login } from "./features/auth/Login";
import { Register } from "./features/auth/Register";
import { Dashboard } from "./features/user-dashboard/Dashboard";
import { History } from "./features/history/History";

function Placeholder({ title, owner }: { title: string; owner: string }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>This screen is owned by {owner} and hasn't been merged into main yet.</p>
    </div>
  );
}

// The root route MUST render an <Outlet /> or nothing below it ever
// shows up - this was missing before and caused a blank white page.
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const authLayoutRoute = createRoute({
  id: "auth-layout",
  getParentRoute: () => rootRoute,
  component: AuthLayout,
});

const loginRoute = createRoute({
  path: "/login",
  getParentRoute: () => authLayoutRoute,
  component: Login,
});

const registerRoute = createRoute({
  path: "/register",
  getParentRoute: () => authLayoutRoute,
  component: Register,
});

const appLayoutRoute = createRoute({
  id: "app-layout",
  getParentRoute: () => rootRoute,
  component: App,
});

const indexRoute = createRoute({
  path: "/",
  getParentRoute: () => appLayoutRoute,
  component: Dashboard,
});

const dashboardRoute = createRoute({
  path: "/dashboard",
  getParentRoute: () => appLayoutRoute,
  component: Dashboard,
});

const historyRoute = createRoute({
  path: "/history",
  getParentRoute: () => appLayoutRoute,
  component: History,
});

const joinQueueRoute = createRoute({
  path: "/join-queue",
  getParentRoute: () => appLayoutRoute,
  component: () => <Placeholder title="Join Queue" owner="Kashf" />,
});

const queueStatusRoute = createRoute({
  path: "/queue-status",
  getParentRoute: () => appLayoutRoute,
  component: () => <Placeholder title="Queue Status" owner="Kashf" />,
});

const notificationsRoute = createRoute({
  path: "/notifications",
  getParentRoute: () => appLayoutRoute,
  component: () => <Placeholder title="Notifications" owner="Kashf" />,
});

const adminDashboardRoute = createRoute({
  path: "/admin/dashboard",
  getParentRoute: () => appLayoutRoute,
  component: () => <Placeholder title="Admin Dashboard" owner="Frances" />,
});

const adminServicesRoute = createRoute({
  path: "/admin/services",
  getParentRoute: () => appLayoutRoute,
  component: () => <Placeholder title="Service Management" owner="Frances" />,
});

const adminQueueRoute = createRoute({
  path: "/admin/queue",
  getParentRoute: () => appLayoutRoute,
  component: () => <Placeholder title="Queue Management" owner="Ian" />,
});

const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute, registerRoute]),
  appLayoutRoute.addChildren([
    indexRoute,
    dashboardRoute,
    historyRoute,
    joinQueueRoute,
    queueStatusRoute,
    notificationsRoute,
    adminDashboardRoute,
    adminServicesRoute,
    adminQueueRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
