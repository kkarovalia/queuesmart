import type { Service, QueueEntry, Table, Reservation } from '../contracts/types'

export const mockServices: Service[] = [
    {
        id: 'svc-1',
        name: 'Dinner Reservations',
        description: 'Table reservations for the main dining room.',
        expectedDurationMinutes: 60,
        priority: 'high',
        status: 'open',
    },
    {
        id: 'svc-2',
        name: 'Walk-in Waitlist',
        description: 'First-come, first-served seating for walk-in guests.',
        expectedDurationMinutes: 45,
        priority: 'medium',
        status: 'open',
    },
]

export const mockQueueEntries: QueueEntry[] = [
    { id: 'q-1', serviceId: 'svc-1', customerName: 'Alice Chen', joinedAt: '2026-07-09T17:15:00Z' },
    { id: 'q-2', serviceId: 'svc-1', customerName: 'Marcus Ortiz', joinedAt: '2026-07-09T17:20:00Z' },
    { id: 'q-3', serviceId: 'svc-1', customerName: 'Priya Patel', joinedAt: '2026-07-09T17:25:00Z' },
    { id: 'q-4', serviceId: 'svc-2', customerName: 'Sam Rivera', joinedAt: '2026-07-09T17:05:00Z' },
    { id: 'q-5', serviceId: 'svc-2', customerName: 'Jordan Lee', joinedAt: '2026-07-09T17:10:00Z' },
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
