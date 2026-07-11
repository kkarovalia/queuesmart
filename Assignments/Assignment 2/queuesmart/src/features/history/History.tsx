import { useState } from "react";
import { Card, Badge } from "../../ui/Card";
import { useHistory } from "../../api";
import type { HistoryRecord } from "../../contracts/types";

type OutcomeFilter = "all" | HistoryRecord["outcome"];

function toneForOutcome(outcome: HistoryRecord["outcome"]) {
  if (outcome === "seated") return "success";
  if (outcome === "cancelled") return "neutral";
  return "danger"; // no-show
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function History() {
  const [filter, setFilter] = useState<OutcomeFilter>("all");
  const historyQuery = useHistory();

  if (historyQuery.isLoading) {
    return <p>Loading history...</p>;
  }

  const history = historyQuery.data ?? [];
  const visibleRows = filter === "all" ? history : history.filter((row) => row.outcome === filter);

  return (
    <div>
      <h1>My History</h1>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="outcome-filter" style={{ marginRight: 8, fontSize: "0.9rem" }}>
          Filter by outcome:
        </label>
        <select
          id="outcome-filter"
          className="input"
          style={{ width: "auto", display: "inline-block" }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as OutcomeFilter)}
        >
          <option value="all">All</option>
          <option value="seated">Seated</option>
          <option value="cancelled">Cancelled</option>
          <option value="no-show">No-show</option>
        </select>
      </div>

      <Card>
        {visibleRows.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>No history matches that filter.</p>
        ) : (
          <div className="table-scroll">
          <table className="simple-table">
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
                  <td>{formatDate(row.date)}</td>
                  <td>{row.serviceName}</td>
                  <td>{row.partySize}</td>
                  <td>{row.waitMinutes > 0 ? `${row.waitMinutes} min` : "—"}</td>
                  <td>
                    <Badge tone={toneForOutcome(row.outcome)}>{row.outcome}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
