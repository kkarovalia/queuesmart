import { useMemo, useState } from 'react'
import { tablePreferences } from '../../data/mockQueueData'
import type { ActiveQueueEntry, QueueFormData, RestaurantService } from '../../types/queue'
import '../queue-flow/queue-flow.css'

type JoinQueueScreenProps = {
    services: RestaurantService[]
    activeQueue: ActiveQueueEntry | null
    onJoinQueue: (queueForm: QueueFormData) => void
    onLeaveQueue: () => void
}

const partySizes = [1, 2, 3, 4, 5, 6]

export function JoinQueueScreen({
    services,
    activeQueue,
    onJoinQueue,
    onLeaveQueue,
}: JoinQueueScreenProps) {
    const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
    const [partySize, setPartySize] = useState(4)
    const [preferredDate, setPreferredDate] = useState('2026-07-10')
    const [preferredTime, setPreferredTime] = useState('19:00')
    const [tablePreference, setTablePreference] = useState(tablePreferences[0])

    const selectedService = useMemo(
        () => services.find((service) => service.id === serviceId) ?? services[0],
        [serviceId, services],
    )

    const submitQueue = () => {
        if (!selectedService) {
            return
        }

        onJoinQueue({
            serviceId: selectedService.id,
            partySize,
            preferredDate,
            preferredTime,
            tablePreference,
        })
    }

    return (
        <section className="queue-page queue-page--join" aria-labelledby="join-queue-heading">
            <div className="queue-page__heading">
                <p className="queue-page__eyebrow">Guest waitlist</p>
                <h1 id="join-queue-heading">Join a Restaurant Queue</h1>
                <p>
                    Choose a restaurant service, party size, and seating preference to see the
                    current mocked wait-time estimate.
                </p>
            </div>

            <div className="queue-card queue-form-card">
                <label className="queue-field" htmlFor="service-select">
                    <span>Select service</span>
                    <select
                        id="service-select"
                        value={serviceId}
                        onChange={(event) => setServiceId(event.target.value)}
                    >
                        {services.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.name}
                            </option>
                        ))}
                    </select>
                </label>

                <fieldset className="queue-field queue-fieldset">
                    <legend>Party size</legend>
                    <div className="queue-segmented-buttons" aria-label="Party size">
                        {partySizes.map((size) => (
                            <button
                                className={partySize === size ? 'queue-segment is-active' : 'queue-segment'}
                                key={size}
                                type="button"
                                aria-pressed={partySize === size}
                                onClick={() => setPartySize(size)}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <div className="queue-form-row">
                    <label className="queue-field" htmlFor="preferred-date">
                        <span>Preferred date</span>
                        <input
                            id="preferred-date"
                            type="date"
                            value={preferredDate}
                            onChange={(event) => setPreferredDate(event.target.value)}
                        />
                    </label>
                    <label className="queue-field" htmlFor="preferred-time">
                        <span>Preferred time</span>
                        <input
                            id="preferred-time"
                            type="time"
                            value={preferredTime}
                            onChange={(event) => setPreferredTime(event.target.value)}
                        />
                    </label>
                </div>

                <label className="queue-field" htmlFor="table-preference">
                    <span>Preferred table</span>
                    <select
                        id="table-preference"
                        value={tablePreference}
                        onChange={(event) => setTablePreference(event.target.value)}
                    >
                        {tablePreferences.map((preference) => (
                            <option key={preference}>{preference}</option>
                        ))}
                    </select>
                </label>

                <button className="queue-primary-button" type="button" onClick={submitQueue} disabled={Boolean(activeQueue)}>
                    {activeQueue ? 'Already in a waitlist' : 'Join Waitlist'}
                </button>

                {activeQueue ? (
                    <button className="queue-secondary-button queue-danger-button" type="button" onClick={onLeaveQueue}>
                        Leave Queue
                    </button>
                ) : null}
            </div>

            {selectedService ? (
                <aside className="queue-card queue-metrics-card" aria-label="Selected service estimate">
                    <div className="queue-metric-row">
                        <span>Current queue length</span>
                        <strong>{selectedService.currentQueueLength} parties</strong>
                    </div>
                    <div className="queue-metric-row">
                        <span>Estimated wait</span>
                        <strong>{selectedService.estimatedWait}</strong>
                    </div>
                    <div className="queue-metric-row">
                        <span>Expected duration</span>
                        <strong>{selectedService.expectedDurationMinutes} min</strong>
                    </div>
                    <p className="queue-muted-copy">{selectedService.description}</p>
                    <div className="queue-callout">
                        <strong>Queue updates included</strong>
                        <span>QueueSmart will notify you when your table is almost ready and ready.</span>
                    </div>
                </aside>
            ) : null}

            {activeQueue ? (
                <div className="queue-success-banner">
                    <strong>You joined {activeQueue.serviceName}.</strong>
                    <span>
                        Party of {activeQueue.partySize} is position {activeQueue.position} with an estimated wait of{' '}
                        {activeQueue.estimatedWait}.
                    </span>
                </div>
            ) : null}
        </section>
    )
}
