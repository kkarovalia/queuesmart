import { createRootRoute } from '@tanstack/react-router'
import { QueueFlowProvider } from '../features/queue-flow/QueueFlowProvider'
import { AppShell } from '../ui/AppShell'

export const Route = createRootRoute({
    component: QueueSmartRoot,
})

function QueueSmartRoot() {
    return (
        <QueueFlowProvider>
            <AppShell />
        </QueueFlowProvider>
    )
}
