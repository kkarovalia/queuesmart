import type {
  Service,
  QueueEntry,
  HistoryRecord,
  AppNotification,
} from "../contracts/types";

export const mockServices: Service[] = [
  {
    id: "svc-dinner-waitlist",
    name: "Dinner Waitlist",
    description: "General dinner seating, walk-in waitlist.",
    expectedDurationMinutes: 45,
    priority: "high",
    isOpen: true,
    currentQueueLength: 12,
    estimatedWaitMinutes: 40,
  },
  {
    id: "svc-bar-seating",
    name: "Bar Seating",
    description: "First come, first served seating at the bar.",
    expectedDurationMinutes: 30,
    priority: "medium",
    isOpen: true,
    currentQueueLength: 4,
    estimatedWaitMinutes: 15,
  },
  {
    id: "svc-patio-seating",
    name: "Patio Seating",
    description: "Outdoor patio tables, weather permitting.",
    expectedDurationMinutes: 40,
    priority: "medium",
    isOpen: true,
    currentQueueLength: 6,
    estimatedWaitMinutes: 25,
  },
  {
    id: "svc-private-dining",
    name: "Private Dining",
    description: "Reservation-only private room bookings.",
    expectedDurationMinutes: 120,
    priority: "low",
    isOpen: false,
    currentQueueLength: 0,
    estimatedWaitMinutes: 0,
  },
];

export const mockActiveQueueEntry: QueueEntry = {
  id: "q1",
  userId: "123", // matches the placeholder id in api.ts's fetchUser()
  serviceId: "svc-dinner-waitlist",
  partySize: 4,
  position: 3,
  estimatedWaitMinutes: 35,
  status: "waiting",
  joinedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockHistory: HistoryRecord[] = [
  {
    id: "h1",
    serviceName: "Dinner Waitlist",
    date: "2026-06-19",
    partySize: 4,
    outcome: "seated",
    waitMinutes: 40,
  },
  {
    id: "h2",
    serviceName: "Dinner Waitlist",
    date: "2026-06-02",
    partySize: 2,
    outcome: "cancelled",
    waitMinutes: 0,
  },
  {
    id: "h3",
    serviceName: "Bar Seating",
    date: "2026-05-23",
    partySize: 1,
    outcome: "seated",
    waitMinutes: 15,
  },
  {
    id: "h4",
    serviceName: "Dinner Waitlist",
    date: "2026-05-12",
    partySize: 5,
    outcome: "no-show",
    waitMinutes: 55,
  },
];

export const mockNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "You're almost up!",
    body: "You're next in line for Dinner Waitlist.",
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    read: false,
    kind: "status-change",
  },
  {
    id: "n2",
    title: "Your table is ready",
    body: "Please head to the host stand within 5 minutes.",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    read: true,
    kind: "status-change",
  },
];
