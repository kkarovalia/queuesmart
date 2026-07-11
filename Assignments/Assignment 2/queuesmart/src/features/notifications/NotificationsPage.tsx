import { useQueueFlow } from '../queue-flow/useQueueFlow'
import { NotificationsPanel } from './NotificationsPanel'

export function NotificationsPage() {
    const { notifications, markAllRead } = useQueueFlow()

    return <NotificationsPanel notifications={notifications} onMarkAllRead={markAllRead} />
}
