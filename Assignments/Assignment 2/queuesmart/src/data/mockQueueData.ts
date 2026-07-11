import type { RestaurantService } from '../types/queue'

export const restaurantServices: RestaurantService[] = [
    {
        id: 'dinner-waitlist',
        name: 'Dinner Waitlist',
        description: 'General dining room seating for walk-in guests.',
        expectedDurationMinutes: 45,
        priority: 'high',
        currentQueueLength: 12,
        estimatedWait: '35-45 min',
        tablePreferenceLabel: 'Dining room',
    },
    {
        id: 'bar-seating',
        name: 'Bar Seating',
        description: 'First-come bar seats for smaller parties.',
        expectedDurationMinutes: 30,
        priority: 'medium',
        currentQueueLength: 6,
        estimatedWait: '15-20 min',
        tablePreferenceLabel: 'Bar counter',
    },
    {
        id: 'patio-seating',
        name: 'Patio Seating',
        description: 'Outdoor seating when weather and capacity allow.',
        expectedDurationMinutes: 40,
        priority: 'medium',
        currentQueueLength: 4,
        estimatedWait: '10-15 min',
        tablePreferenceLabel: 'Covered patio',
    },
    {
        id: 'private-dining',
        name: 'Private Dining',
        description: 'Private room bookings for larger or special parties.',
        expectedDurationMinutes: 120,
        priority: 'high',
        currentQueueLength: 0,
        estimatedWait: 'Reservation only',
        tablePreferenceLabel: 'Private room',
    },
]

export const tablePreferences = [
    'No preference',
    'Booth',
    'Window table',
    'Patio',
    'Bar counter',
    'Private room',
]
