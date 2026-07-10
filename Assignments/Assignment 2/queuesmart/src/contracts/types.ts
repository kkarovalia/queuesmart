export type PriorityLevel = "low" | "medium" | "high";

export type QueueStatus = "waiting" | "almost-ready" | "served" | "cancelled" | "no-show";

export interface Service {
  id: string;
  name: string; // required, max 100 chars
  description: string; // required
  expectedDurationMinutes: number; // required, positive number
  priority: PriorityLevel;
  isOpen: boolean;
  currentQueueLength: number;
  estimatedWaitMinutes: number;
}

export interface QueueEntry {
  id: string;
  userId: string;
  serviceId: string;
  partySize: number;
  position: number;
  estimatedWaitMinutes: number;
  status: QueueStatus;
  joinedAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface HistoryRecord {
  id: string;
  serviceName: string;
  date: string; // ISO date
  partySize: number;
  outcome: "seated" | "cancelled" | "no-show";
  waitMinutes: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: "queue-update" | "status-change";
}
