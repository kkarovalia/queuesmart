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
