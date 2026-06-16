import type { DashboardData } from "./types";
import RequestSummary from "./RequestSummary";

type DashboardProps = {
  dashboard: DashboardData;
  onNewRequest: () => void;
  onOpenRequest: (requestId: number) => void;
  onOpenClosedRequests: () => void;
};

export default function Dashboard({
  dashboard,
  onNewRequest,
  onOpenRequest,
  onOpenClosedRequests,
}: DashboardProps) {
  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Review open cruise travel requests and start new intake.</p>
        </div>
        <button type="button" onClick={onNewRequest}>
          New Request
        </button>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Open requests</span>
          <strong className="stat-value">{dashboard.open_count}</strong>
        </article>
        <article className="stat-card stat-card-warning">
          <span className="stat-label">Stale requests</span>
          <strong className="stat-value">{dashboard.stale_count}</strong>
          <span className="stat-hint">No request activity in 3+ days</span>
        </article>
        <article
          className="stat-card stat-card-clickable"
          role="button"
          tabIndex={0}
          onClick={onOpenClosedRequests}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenClosedRequests();
            }
          }}
        >
          <span className="stat-label">Closed requests</span>
          <strong className="stat-value">{dashboard.closed_count}</strong>
          <span className="stat-hint stat-hint-neutral">View closed requests and reopen if needed</span>
        </article>
      </div>

      <section className="card">
        <h3>Open Requests</h3>
        {dashboard.open_requests.length === 0 ? (
          <p>No open requests yet. Create the first one.</p>
        ) : (
          <div className="requests">
            {dashboard.open_requests.map((request) => (
              <button
                type="button"
                key={request.id}
                className={`request-item request-button ${request.is_stale ? "stale" : ""}`}
                onClick={() => onOpenRequest(request.id)}
              >
                <RequestSummary
                  request={request}
                  nextOpenTask={request.next_open_task}
                  lastWorkedAt={request.last_worked_at}
                  lastWorkedBy={request.last_worked_by}
                  isStale={request.is_stale}
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
