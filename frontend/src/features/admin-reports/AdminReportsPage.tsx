import { useState } from 'react'
import { useGenerateReport, downloadReportCsv, type ReportKind } from '../../api'
import { mockServices } from '../../data/mockData'
import type { ReportFilters } from '../../contracts/types'
import './admin-reports.css'
import '../admin-dashboard/admin-dashboard.css'
import '../history/history.css'

export function AdminReportsPage() {
    const [filters, setFilters] = useState<ReportFilters>({ from: '', to: '', serviceId: 'all' })
    const [downloading, setDownloading] = useState<ReportKind | null>(null)
    const [downloadError, setDownloadError] = useState<string | null>(null)
    const reportMutation = useGenerateReport()

    function handleGenerate() {
        reportMutation.mutate(filters)
    }

    async function handleDownload(kind: ReportKind) {
        setDownloadError(null)
        setDownloading(kind)
        try {
            await downloadReportCsv(kind, filters)
        } catch (error) {
            setDownloadError(error instanceof Error ? error.message : 'Download failed.')
        } finally {
            setDownloading(null)
        }
    }

    const report = reportMutation.data

    return (
        <section className="admin-dashboard page">
            <header className="page-header">
                <div>
                    <h1>Reports</h1>
                    <p>Participation history, service activity, and usage stats for a date range.</p>
                </div>
            </header>

            <div className="admin-section panel admin-reports__filters">
                <div className="admin-reports__field">
                    <label htmlFor="report-from">From</label>
                    <input
                        id="report-from"
                        type="date"
                        value={filters.from}
                        onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))}
                    />
                </div>
                <div className="admin-reports__field">
                    <label htmlFor="report-to">To</label>
                    <input
                        id="report-to"
                        type="date"
                        value={filters.to}
                        onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))}
                    />
                </div>
                <div className="admin-reports__field">
                    <label htmlFor="report-service">Service</label>
                    <select
                        id="report-service"
                        value={filters.serviceId}
                        onChange={e => setFilters(prev => ({ ...prev, serviceId: e.target.value }))}
                    >
                        <option value="all">All services</option>
                        {mockServices.map(service => (
                            <option key={service.id} value={service.id}>{service.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    className="admin-reports__generate"
                    onClick={handleGenerate}
                    disabled={reportMutation.isPending}
                >
                    {reportMutation.isPending ? 'Generating...' : 'Generate report'}
                </button>
            </div>

            {reportMutation.isError && (
                <p role="alert">{reportMutation.error?.message ?? 'Failed to generate report.'}</p>
            )}
            {downloadError && <p role="alert">{downloadError}</p>}

            {report && (
                <>
                    <div className="admin-section panel admin-reports__summary">
                        <div>
                            <span className="admin-reports__summary-label">Total served</span>
                            <span className="admin-reports__summary-value">{report.summary.totalServed}</span>
                        </div>
                        <div>
                            <span className="admin-reports__summary-label">Cancelled</span>
                            <span className="admin-reports__summary-value">{report.summary.totalCancelled}</span>
                        </div>
                        <div>
                            <span className="admin-reports__summary-label">No shows</span>
                            <span className="admin-reports__summary-value">{report.summary.totalNoShow}</span>
                        </div>
                        <div>
                            <span className="admin-reports__summary-label">Average wait</span>
                            <span className="admin-reports__summary-value">{report.summary.averageWaitMinutes} min</span>
                        </div>
                        {report.summary.busiestService && (
                            <div>
                                <span className="admin-reports__summary-label">Busiest service</span>
                                <span className="admin-reports__summary-value admin-reports__summary-value--text">
                                    {report.summary.busiestService.serviceName}
                                </span>
                            </div>
                        )}
                        <button
                            type="button"
                            className="admin-reports__download"
                            onClick={() => handleDownload('summary')}
                            disabled={downloading === 'summary'}
                        >
                            {downloading === 'summary' ? 'Downloading...' : 'Download summary CSV'}
                        </button>
                    </div>

                    <div className="admin-section panel table-wrap">
                        <div className="admin-reports__section-header">
                            <h2>Service activity</h2>
                            <button
                                type="button"
                                className="admin-reports__download"
                                onClick={() => handleDownload('services')}
                                disabled={downloading === 'services'}
                            >
                                {downloading === 'services' ? 'Downloading...' : 'Download CSV'}
                            </button>
                        </div>
                        {report.services.length === 0 ? (
                            <p className="history-page__empty">No services found.</p>
                        ) : (
                            <table className="history-page__table">
                                <thead>
                                    <tr>
                                        <th>Service</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Entries</th>
                                        <th>Seated</th>
                                        <th>Cancelled</th>
                                        <th>No show</th>
                                        <th>Average wait</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.services.map(row => (
                                        <tr key={row.serviceId}>
                                            <td>{row.serviceName}</td>
                                            <td>{row.status}</td>
                                            <td>{row.priority}</td>
                                            <td>{row.totalEntries}</td>
                                            <td>{row.seatedCount}</td>
                                            <td>{row.cancelledCount}</td>
                                            <td>{row.noShowCount}</td>
                                            <td>{row.averageWaitMinutes} min</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="admin-section panel table-wrap">
                        <div className="admin-reports__section-header">
                            <h2>Participation history</h2>
                            <button
                                type="button"
                                className="admin-reports__download"
                                onClick={() => handleDownload('users')}
                                disabled={downloading === 'users'}
                            >
                                {downloading === 'users' ? 'Downloading...' : 'Download CSV'}
                            </button>
                        </div>
                        {report.participation.length === 0 ? (
                            <p className="history-page__empty">No records in this range.</p>
                        ) : (
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
                                    {report.participation.map((row, index) => (
                                        <tr key={`${row.userId}-${row.serviceId}-${index}`}>
                                            <td>{new Date(row.resolvedAt).toLocaleDateString()}</td>
                                            <td>{row.userEmail}</td>
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
                </>
            )}
        </section>
    )
}
