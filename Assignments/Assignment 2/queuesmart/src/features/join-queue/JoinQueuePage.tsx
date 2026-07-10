import { restaurantServices } from '../../data/mockQueueData'
import { useQueueFlow } from '../queue-flow/useQueueFlow'
import { JoinQueueScreen } from './JoinQueueScreen'

export function JoinQueuePage() {
    const { activeQueue, joinQueue, leaveQueue } = useQueueFlow()

    return (
        <JoinQueueScreen
            services={restaurantServices}
            activeQueue={activeQueue}
            onJoinQueue={joinQueue}
            onLeaveQueue={leaveQueue}
        />
    )
}
