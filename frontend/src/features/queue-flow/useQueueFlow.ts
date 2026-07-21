import { useContext } from 'react'
import { QueueFlowContext } from './QueueFlowContext'

export function useQueueFlow() {
    const context = useContext(QueueFlowContext)

    if (!context) {
        throw new Error('useQueueFlow must be used inside QueueFlowProvider')
    }

    return context
}
