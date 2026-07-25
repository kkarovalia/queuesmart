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
