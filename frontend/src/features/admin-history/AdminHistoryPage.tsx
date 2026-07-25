import { useAllHistory } from '../../api'
import '../history/history.css'
import '../admin-dashboard/admin-dashboard.css'

export function AdminHistoryPage() {
    const historyQuery = useAllHistory()

    return (
        <section className="admin-dashboard page">
            <header className="page-header">
                <div>
                    <h1>History</h1>
                    <p>Every customer's past waitlists and seating outcomes.</p>
                </div>
            </header>

            <div className="admin-section panel table-wrap">
                {historyQuery.isLoading && <p className="admin-loading">Loading history...</p>}
                {historyQuery.isError && <p role="alert">Failed to load history.</p>}
                {historyQuery.data && historyQuery.data.length === 0 && (
                    <p className="history-page__empty">No history yet.</p>
                )}
                {historyQuery.data && historyQuery.data.length > 0 && (
                    <table className="history-page__table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Service</th>
                                <th>Party size</th>
                                <th>Wait</th>
                                <th>Outcome</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyQuery.data.map(row => (
                                <tr key={row.id}>
                                    <td>{new Date(row.date).toLocaleDateString()}</td>
                                    <td>{row.customerEmail}</td>
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
        </section>
    )
}
