import { useState } from 'react'
import { useWaitlistHistory } from '../../api'
import type { WaitlistOutcome } from '../../contracts/types'
import './history.css'

type OutcomeFilter = 'all' | WaitlistOutcome

export function HistoryPage() {
    const [filter, setFilter] = useState<OutcomeFilter>('all')
    const historyQuery = useWaitlistHistory()

    if (historyQuery.isLoading) {
        return <p>Loading history...</p>
    }

    const history = historyQuery.data ?? []
    const visibleRows = filter === 'all' ? history : history.filter((row) => row.outcome === filter)

    return (
        <div className="history-page">
            <h1>My History</h1>

            <div className="history-page__filter">
                <label htmlFor="outcome-filter">Filter by outcome:</label>
                <select
                    id="outcome-filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as OutcomeFilter)}
                >
                    <option value="all">All</option>
                    <option value="seated">Seated</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No show</option>
                </select>
            </div>

            <div className="history-page__card">
                {visibleRows.length === 0 ? (
                    <p className="history-page__empty">No history matches that filter.</p>
                ) : (
                    <table className="history-page__table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Service</th>
                                <th>Party size</th>
                                <th>Wait</th>
                                <th>Outcome</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row) => (
                                <tr key={row.id}>
                                    <td>{new Date(row.date).toLocaleDateString()}</td>
                                    <td>{row.serviceName}</td>
                                    <td>{row.partySize}</td>
                                    <td>{row.waitMinutes > 0 ? `${row.waitMinutes} min` : '-'}</td>
                                    <td>
                                        <span className={`history-page__outcome history-page__outcome--${row.outcome}`}>
                                            {row.outcome}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
