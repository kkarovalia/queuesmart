export type PriorityLevel = 'low' | 'medium' | 'high'
export type ServiceStatus = 'open' | 'closed'

export interface Service {
    id: string
    name: string
    description: string
    expectedDurationMinutes: number
    priority: PriorityLevel
    status: ServiceStatus
    // Placeholder display text until a real wait-time-estimate service exists (A1 architecture calls this out as future work).
    estimatedWait: string
    tablePreferenceLabel: string
}

export interface ServiceFormInput {
    name: string
    description: string
    expectedDurationMinutes: number
    priority: PriorityLevel
}

export interface QueueEntry {
    id: string
    serviceId: string
    customerName: string
    joinedAt: string
    partySize: number
    estimatedWaitMinutes: number
}

export interface QueueEntryFormInput {
    customerName: string
    
}

export type TableStatus = 'available' | 'occupied'

export interface Table {
    id: string
    label: string
    seats: number
    section: string
    status: TableStatus
}

export interface TableFormInput {
    label: string
    seats: number
    section: string
}

export type ReservationStatus = 'confirmed' | 'cancelled' | 'completed'

export interface Reservation {
    id: string
    customerName: string
    partySize: number
    dateTime: string
    tableId: string | null
    status: ReservationStatus
}

export interface ReservationFormInput {
    customerName: string
    partySize: number
    dateTime: string
    tableId: string | null
}

export type MyQueueStatusValue = 'waiting' | 'almost-ready' | 'served'

export interface MyQueueStatus {
    id: string
    serviceId: string
    partySize: number
    position: number
    estimatedWaitMinutes: number
    status: MyQueueStatusValue
    joinedAt: string
}

export type WaitlistOutcome = 'seated' | 'cancelled' | 'no-show'

export interface WaitlistHistoryRecord {
    id: string
    serviceName: string
    date: string
    partySize: number
    outcome: WaitlistOutcome
    waitMinutes: number
}

export interface AdminHistoryRecord extends WaitlistHistoryRecord {
    customerEmail: string
}

export interface AppNotification {
    id: string
    title: string
    body: string
    createdAt: string
    read: boolean
}

// --- Reporting (Final Project). Backend: backend/src/modules/reports ---
// Matches the real backend response shapes exactly (database.ts's
// UserParticipationRow / ServiceActivityRow / UsageSummaryReport), not a
// guess. Three separate reports, matching the assignment's three required
// report contents: participation history, service/queue activity, and
// usage stats.

export interface ReportFilters {
    from: string
    to: string
    serviceId: string | 'all'
}

export interface UserParticipationRow {
    userId: string
    userName: string
    userEmail: string
    serviceId: string
    serviceName: string
    partySize: number
    joinedAt: string
    resolvedAt: string
    outcome: WaitlistOutcome
    waitMinutes: number
}

export interface ServiceActivityRow {
    serviceId: string
    serviceName: string
    status: ServiceStatus
    priority: PriorityLevel
    totalEntries: number
    seatedCount: number
    cancelledCount: number
    noShowCount: number
    averageWaitMinutes: number
}

export interface UsageSummaryReport {
    totalServed: number
    totalCancelled: number
    totalNoShow: number
    averageWaitMinutes: number
    busiestService: { serviceName: string; totalEntries: number } | null
    rangeFrom: string | null
    rangeTo: string | null
}
