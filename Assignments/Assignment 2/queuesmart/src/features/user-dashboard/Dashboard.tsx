import { Link } from "@tanstack/react-router";
import { Card, Badge } from "../../ui/Card";
import { useUser, useServices, useActiveQueueEntry, useNotifications } from "../../api";

function toneForService(isOpen: boolean) {
  return isOpen ? "success" : "neutral";
}

export function Dashboard() {
  const userQuery = useUser();
  const servicesQuery = useServices();
  const activeQueueQuery = useActiveQueueEntry();
  const notificationsQuery = useNotifications();

  if (userQuery.isLoading || servicesQuery.isLoading) {
    return <p>Loading dashboard...</p>;
  }

  const user = userQuery.data;
  const services = servicesQuery.data ?? [];
  const activeEntry = activeQueueQuery.data ?? null;
  const notifications = notificationsQuery.data ?? [];
  const activeService = services.find((s) => s.id === activeEntry?.serviceId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <h1>Good evening, {user?.name ?? "there"}!</h1>

      {}
      <Card>
        <h2 style={{ marginTop: 0 }}>Your current queue</h2>
        {activeEntry && activeService ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{activeService.name}</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                Position {activeEntry.position} · Party of {activeEntry.partySize}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Badge tone="info">~{activeEntry.estimatedWaitMinutes} min wait</Badge>
              <div style={{ marginTop: 8 }}>
                <Link to="/queue-status">View status →</Link>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--color-text-muted)" }}>You're not in a queue right now.</p>
        )}
      </Card>

      {}
      <Card>
        <h2 style={{ marginTop: 0 }}>Available services</h2>
        <div className="table-scroll">
        <table className="simple-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Est. wait</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>{service.name}</td>
                <td>
                  <Badge tone={toneForService(service.isOpen)}>
                    {service.isOpen ? "Open" : "Closed"}
                  </Badge>
                </td>
                <td>{service.isOpen ? `${service.estimatedWaitMinutes} min` : "—"}</td>
                <td>
                  <Link to="/join-queue">Join</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Notifications</h2>
          {unreadCount > 0 && <Badge tone="warning">{unreadCount} new</Badge>}
        </div>
        <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
          {notifications.slice(0, 3).map((note) => (
            <li key={note.id} style={{ marginBottom: 6 }}>
              <strong>{note.title}</strong> — {note.body}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 10 }}>
          <Link to="/notifications">View all notifications →</Link>
        </div>
      </Card>
    </div>
  );
}
