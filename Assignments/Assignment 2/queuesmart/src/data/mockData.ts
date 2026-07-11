import type {
    Service,
    QueueEntry,
    Table,
    Reservation,
    MyQueueStatus,
    WaitlistHistoryRecord,
    AppNotification,
} from '../contracts/types'

export const mockServices: Service[] = [
    {
        id: 'svc-1',
        name: 'Dinner Waitlist',
        description: 'General dining room seating for walk-in guests.',
        expectedDurationMinutes: 45,
        priority: 'high',
        status: 'open',
    },
    {
        id: 'svc-2',
        name: 'Bar Seating',
        description: 'First-come bar seats for smaller parties.',
        expectedDurationMinutes: 30,
        priority: 'medium',
        status: 'open',
    },
    {
        id: 'svc-3',
        name: 'Patio Seating',
        description: 'Outdoor seating when weather and capacity allow.',
        expectedDurationMinutes: 40,
        priority: 'medium',
        status: 'open',
    },
    {
        id: 'svc-4',
        name: 'Private Dining',
        description: 'Private room seating for larger parties and special events.',
        expectedDurationMinutes: 120,
        priority: 'high',
        status: 'closed',
    },
]

export const mockQueueEntries: QueueEntry[] = [
    { id: 'q-1', serviceId: 'svc-1', customerName: 'Emily Johnson', partySize: 4, estimatedWaitMinutes: 42, joinedAt: '2026-07-10T18:12:00Z' },
    { id: 'q-2', serviceId: 'svc-1', customerName: 'Maya Patel', partySize: 2, estimatedWaitMinutes: 37, joinedAt: '2026-07-10T18:17:00Z' },
    { id: 'q-3', serviceId: 'svc-1', customerName: 'Carlos Ramirez', partySize: 3, estimatedWaitMinutes: 33, joinedAt: '2026-07-10T18:21:00Z' },
    { id: 'q-4', serviceId: 'svc-1', customerName: 'Sarah Kim', partySize: 4, estimatedWaitMinutes: 29, joinedAt: '2026-07-10T18:25:00Z' },
    { id: 'q-5', serviceId: 'svc-2', customerName: 'David Brown', partySize: 2, estimatedWaitMinutes: 18, joinedAt: '2026-07-10T18:29:00Z' },
    { id: 'q-6', serviceId: 'svc-3', customerName: 'Olivia Martin', partySize: 3, estimatedWaitMinutes: 12, joinedAt: '2026-07-10T18:31:00Z' },
]

export const mockTables: Table[] = [
    { id: 'tbl-1', label: 'Table 1', seats: 2, section: 'Main Floor', status: 'available' },
    { id: 'tbl-2', label: 'Table 2', seats: 2, section: 'Main Floor', status: 'occupied' },
    { id: 'tbl-3', label: 'Table 3', seats: 4, section: 'Main Floor', status: 'available' },
    { id: 'tbl-4', label: 'Table 4', seats: 6, section: 'Main Floor', status: 'occupied' },
    { id: 'tbl-5', label: 'Patio 1', seats: 4, section: 'Patio', status: 'available' },
    { id: 'tbl-6', label: 'Patio 2', seats: 2, section: 'Patio', status: 'available' },
    { id: 'tbl-7', label: 'Bar Seat A', seats: 1, section: 'Bar', status: 'occupied' },
    { id: 'tbl-8', label: 'Private Room', seats: 10, section: 'Private', status: 'available' },
]

export const mockReservations: Reservation[] = [
    {
        id: 'res-user-1',
        customerName: 'Jamie Lee',
        partySize: 4,
        dateTime: '2026-07-12T19:00:00',
        tableId: 'tbl-3',
        status: 'confirmed',
    },
    {
        id: 'res-1',
        customerName: 'Dana Whitfield',
        partySize: 2,
        dateTime: '2026-07-09T19:00:00Z',
        tableId: 'tbl-2',
        status: 'confirmed',
    },
    {
        id: 'res-2',
        customerName: 'Wei Zhang',
        partySize: 6,
        dateTime: '2026-07-09T19:30:00Z',
        tableId: 'tbl-4',
        status: 'confirmed',
    },
    {
        id: 'res-3',
        customerName: 'Amara Okafor',
        partySize: 4,
        dateTime: '2026-07-09T20:00:00Z',
        tableId: null,
        status: 'confirmed',
    },
    {
        id: 'res-4',
        customerName: 'Liam Fitzgerald',
        partySize: 3,
        dateTime: '2026-07-08T18:30:00Z',
        tableId: 'tbl-1',
        status: 'completed',
    },
    {
        id: 'res-5',
        customerName: 'Ines Moreau',
        partySize: 2,
        dateTime: '2026-07-08T20:00:00Z',
        tableId: 'tbl-5',
        status: 'cancelled',
    },
]

export const mockMyQueueStatus: MyQueueStatus = {
    id: 'my-q-1',
    serviceId: 'svc-2',
    partySize: 4,
    position: 3,
    estimatedWaitMinutes: 35,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
}

export const mockWaitlistHistory: WaitlistHistoryRecord[] = [
    { id: 'h-1', serviceName: 'Dinner Waitlist', date: '2026-06-19', partySize: 4, outcome: 'seated', waitMinutes: 40 },
    { id: 'h-2', serviceName: 'Bar Seating', date: '2026-06-02', partySize: 2, outcome: 'cancelled', waitMinutes: 0 },
    { id: 'h-3', serviceName: 'Patio Seating', date: '2026-05-23', partySize: 1, outcome: 'seated', waitMinutes: 15 },
    { id: 'h-4', serviceName: 'Private Dining', date: '2026-05-12', partySize: 5, outcome: 'no-show', waitMinutes: 55 },
]

export const mockNotifications: AppNotification[] = [
    {
        id: 'n-1',
        title: "You're almost up!",
        body: "You're next in line for the Dinner Waitlist.",
        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        read: false,
    },
    {
        id: 'n-2',
        title: 'Your table is ready',
        body: 'Please head to the host stand within 5 minutes.',
        createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        read: true,
    },
]
