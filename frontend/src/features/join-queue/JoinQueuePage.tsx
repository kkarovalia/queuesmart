import { useServices } from '../../api'
import { useQueueFlow } from '../queue-flow/useQueueFlow'
import { JoinQueueScreen } from './JoinQueueScreen'

export function JoinQueuePage() {
    const services = useServices()
    const { activeQueue, joinQueue, leaveQueue } = useQueueFlow()

    if (services.isLoading) {
        return  (
            "Loading services..."
        )
    }

    if (services.isError || services.data == null) {
        return (
            "Error loading services."
        )
    }

    const queueLengths = services.data.reduce<Record<string, number>>((lengths, entry) => {
        lengths[entry.id] = Math.max(0, (entry.queueLength ?? 0) + (entry.userInQueue ? -1 : 0))
        return lengths
    }, {})

    return (
        <JoinQueueScreen
            services={services.data}
            queueLengths={queueLengths}
            activeQueue={activeQueue}
            onJoinQueue={joinQueue}
            onLeaveQueue={leaveQueue}
        />
    )
}
