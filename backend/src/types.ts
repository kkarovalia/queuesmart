export type UserRole = 'user' | 'admin'

export interface User {
    id: string
    email: string
    passwordHash: string
    role: UserRole
}

export type PriorityLevel = 'low' | 'medium' | 'high'
export type ServiceStatus = 'open' | 'closed'

export interface Service {
    id: string
    name: string
    description: string
    expectedDurationMinutes: number
    priority: PriorityLevel
    status: ServiceStatus
}

export interface ServiceInput {
    name: string
    description: string
    expectedDurationMinutes: number
    priority: PriorityLevel
}

export type QueueEntryStatus = 'waiting' | 'almost-ready' | 'served' | 'left'

export interface QueueEntry {
    id: string
    serviceId: string
    userId: string
    partySize: number
    status: QueueEntryStatus
    joinedAt: string
    servedAt: string | null
}

// Matches the frontend's WaitlistOutcome vocabulary (frontend/src/contracts/types.ts)
// so the API response needs no translation on the way in.
export type WaitlistOutcome = 'seated' | 'cancelled' | 'no-show'

export interface HistoryRecord {
    id: string
    userId: string
    serviceId: string
    serviceName: string
    partySize: number
    joinedAt: string
    resolvedAt: string
    outcome: WaitlistOutcome
    waitMinutes: number
}

export type NotificationKind = 'queue-joined' | 'almost-ready' | 'served'

export interface AppNotification {
    id: string
    userId: string
    kind: NotificationKind
    message: string
    createdAt: string
    read: boolean
}
