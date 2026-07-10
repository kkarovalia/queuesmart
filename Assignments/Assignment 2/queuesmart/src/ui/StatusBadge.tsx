import type { PriorityLevel, ServiceStatus, TableStatus, ReservationStatus } from '../contracts/types'
import './StatusBadge.css'

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
    low: 'Low priority',
    medium: 'Medium priority',
    high: 'High priority',
}

const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
    open: 'Open',
    closed: 'Closed',
}

const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
    available: 'Available',
    occupied: 'Occupied',
}

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
}

// Reservation/table statuses reuse the service open/closed color scale:
// available/confirmed -> "open" green, occupied/cancelled -> "closed" red, completed -> neutral.
const STATUS_COLOR_CLASS: Record<string, string> = {
    available: 'open',
    occupied: 'closed',
    confirmed: 'open',
    cancelled: 'closed',
    completed: 'medium',
}

interface PriorityBadgeProps {
    kind: 'priority'
    value: PriorityLevel
}

interface ServiceStatusBadgeProps {
    kind: 'status'
    value: ServiceStatus
}

interface TableStatusBadgeProps {
    kind: 'tableStatus'
    value: TableStatus
}

interface ReservationStatusBadgeProps {
    kind: 'reservationStatus'
    value: ReservationStatus
}

type StatusBadgeProps =
    | PriorityBadgeProps
    | ServiceStatusBadgeProps
    | TableStatusBadgeProps
    | ReservationStatusBadgeProps

export function StatusBadge(props: StatusBadgeProps) {
    switch (props.kind) {
        case 'priority':
            return (
                <span className={`status-badge status-badge--priority-${props.value}`}>
                    {PRIORITY_LABELS[props.value]}
                </span>
            )
        case 'status':
            return (
                <span className={`status-badge status-badge--status-${props.value}`}>
                    {SERVICE_STATUS_LABELS[props.value]}
                </span>
            )
        case 'tableStatus':
            return (
                <span className={`status-badge status-badge--status-${STATUS_COLOR_CLASS[props.value]}`}>
                    {TABLE_STATUS_LABELS[props.value]}
                </span>
            )
        case 'reservationStatus':
            return (
                <span className={`status-badge status-badge--status-${STATUS_COLOR_CLASS[props.value]}`}>
                    {RESERVATION_STATUS_LABELS[props.value]}
                </span>
            )
    }
}
