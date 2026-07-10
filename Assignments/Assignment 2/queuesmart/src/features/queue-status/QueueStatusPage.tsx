import { useQueueFlow } from '../queue-flow/useQueueFlow'
import { QueueStatusScreen } from './QueueStatusScreen'

export function QueueStatusPage() {
    const { activeQueue, advanceStatus, leaveQueue } = useQueueFlow()

    return (
        <QueueStatusScreen
            activeQueue={activeQueue}
            onAdvanceStatus={advanceStatus}
            onLeaveQueue={leaveQueue}
        />
    )
}
