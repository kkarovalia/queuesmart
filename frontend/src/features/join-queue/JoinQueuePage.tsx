import { useServices } from '../../api'
import { useQueueFlow } from '../queue-flow/useQueueFlow'
import { JoinQueueScreen } from './JoinQueueScreen'

export function JoinQueuePage() {
    const services = useServices()
    const { activeQueue, joinQueue, leaveQueue } = useQueueFlow()

    if (services.isLoading) return <p>Loading services...</p>
    if (services.isError || services.data == null) return <p role="alert">Failed to load services.</p>

    // queueLength counts everyone currently active for the service; subtract
    // the viewer's own entry (if any) so "parties ahead" doesn't count them
    // against themselves.
    const queueLengths = services.data.reduce<Record<string, number>>((lengths, service) => {
        lengths[service.id] = Math.max(0, (service.queueLength ?? 0) + (service.userInQueue ? -1 : 0))
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
