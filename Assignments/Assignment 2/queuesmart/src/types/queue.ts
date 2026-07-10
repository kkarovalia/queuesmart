export type QueueStatus = 'waiting' | 'almost-ready' | 'served'

export type PriorityLevel = 'low' | 'medium' | 'high'

export type RestaurantService = {
    id: string
    name: string
    description: string
    expectedDurationMinutes: number
    priority: PriorityLevel
    currentQueueLength: number
    estimatedWait: string
    tablePreferenceLabel: string
}

export type QueueFormData = {
    serviceId: string
    partySize: number
    preferredDate: string
    preferredTime: string
    tablePreference: string
}

export type ActiveQueueEntry = QueueFormData & {
    id: string
    serviceName: string
    position: number
    estimatedWait: string
    status: QueueStatus
    joinedAt: string
}

export type QueueNotification = {
    id: string
    title: string
    message: string
    createdAt: string
    read: boolean
    tone: 'info' | 'success' | 'warning'
}
