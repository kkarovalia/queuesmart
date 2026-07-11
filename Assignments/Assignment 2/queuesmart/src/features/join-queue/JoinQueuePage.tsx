import { mockServices, mockQueueEntries } from '../../data/mockData'
import { useQueueFlow } from '../queue-flow/useQueueFlow'
import { JoinQueueScreen } from './JoinQueueScreen'

export function JoinQueuePage() {
    const { activeQueue, joinQueue, leaveQueue } = useQueueFlow()

    const queueLengths = mockQueueEntries.reduce<Record<string, number>>((lengths, entry) => {
        lengths[entry.serviceId] = (lengths[entry.serviceId] ?? 0) + 1
        return lengths
    }, {})

    return (
        <JoinQueueScreen
            services={mockServices}
            queueLengths={queueLengths}
            activeQueue={activeQueue}
            onJoinQueue={joinQueue}
            onLeaveQueue={leaveQueue}
        />
    )
}
