import { useMemo, useState } from 'react'
import { Clock3, UsersRound } from 'lucide-react'
import { tablePreferences } from '../../data/mockData'
import type { Service } from '../../contracts/types'
import type { ActiveQueueEntry, QueueFormData } from '../../types/queue'
import '../queue-flow/queue-flow.css'

type JoinQueueScreenProps = {
    services: Service[]
    queueLengths: Record<string, number>
    activeQueue: ActiveQueueEntry | null
    joinError?: string | null
    isJoining?: boolean
    onJoinQueue: (queueForm: QueueFormData) => Promise<void>
    onLeaveQueue: () => Promise<void>
}

const partySizes = [1, 2, 3, 4, 5, 6]

export function JoinQueueScreen({ services, queueLengths, activeQueue, joinError = null, isJoining = false, onJoinQueue, onLeaveQueue }: JoinQueueScreenProps) {
    const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
    const [partySize, setPartySize] = useState(4)
    const [tablePreference, setTablePreference] = useState(tablePreferences[0])
    const selectedService = useMemo(() => services.find(service => service.id === serviceId) ?? services[0], [serviceId, services])

    async function submitQueue() {
        if (selectedService?.status === 'open') {
            await onJoinQueue({ serviceId: selectedService.id, partySize, tablePreference })
        }
    }

    return (
        <section className="queue-page page" aria-labelledby="join-queue-heading">
            <header className="page-header">
                <div><h1 id="join-queue-heading">Join a Waitlist</h1><p>Walk in, choose a seating service, and track your place in line.</p></div>
            </header>

            <div className="queue-join-layout">
                <div className="queue-card queue-form-card">
                    <label className="queue-field" htmlFor="service-select"><span>Select service</span>
                        <select id="service-select" value={serviceId} onChange={event => setServiceId(event.target.value)}>
                            {services.map(service => <option key={service.id} value={service.id}>{service.name}{service.status === 'open' ? '' : ' - Closed'}</option>)}
                        </select>
                    </label>

                    <fieldset className="queue-field queue-fieldset"><legend>Party size</legend>
                        <div className="queue-segmented-buttons" aria-label="Party size">
                            {partySizes.map(size => <button className={partySize === size ? 'queue-segment is-active' : 'queue-segment'} key={size} type="button" aria-pressed={partySize === size} onClick={() => setPartySize(size)}>{size === 6 ? '6+' : size}</button>)}
                        </div>
                    </fieldset>

                    <label className="queue-field" htmlFor="table-preference"><span>Seating preference <small>(optional)</small></span>
                        <select id="table-preference" value={tablePreference} onChange={event => setTablePreference(event.target.value)}>
                            {tablePreferences.map(preference => <option key={preference}>{preference}</option>)}
                        </select>
                    </label>

                    {selectedService ? <div className="queue-estimate">
                        <div><Clock3 size={18} /><span>Current wait<strong>{selectedService.estimatedWait}</strong></span></div>
                        <div><UsersRound size={18} /><span>Parties ahead<strong>{queueLengths[selectedService.id] ?? 0}</strong></span></div>
                    </div> : null}

                    {joinError ? <p className="queue-error-banner" role="alert">{joinError}</p> : null}
                    <button className="queue-primary-button" type="button" onClick={submitQueue} disabled={Boolean(activeQueue) || isJoining || selectedService?.status !== 'open'}>
                        {activeQueue ? 'Already in a waitlist' : isJoining ? 'Joining...' : selectedService?.status === 'open' ? 'Join Waitlist' : 'Queue Closed'}
                    </button>
                    {activeQueue ? <button className="queue-secondary-button queue-danger-button" type="button" onClick={onLeaveQueue}>Leave current queue</button> : null}
                </div>

                <aside className="queue-card queue-service-summary">
                    <span className={selectedService?.status === 'open' ? 'service-open' : 'service-closed'}>{selectedService?.status === 'open' ? 'Open' : 'Closed'}</span>
                    <h2>{selectedService?.name}</h2>
                    <p>{selectedService?.description}</p>
                    <dl><div><dt>Expected seating cycle</dt><dd>{selectedService?.expectedDurationMinutes} min</dd></div><div><dt>Default area</dt><dd>{selectedService?.tablePreferenceLabel}</dd></div></dl>
                </aside>
            </div>

            {activeQueue ? <div className="queue-success-banner" role="status"><strong>You're on the {activeQueue.serviceName}.</strong><span>Position {activeQueue.position} for a party of {activeQueue.partySize}. Updates are available in My Queue.</span></div> : null}
        </section>
    )
}
