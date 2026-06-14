import type { DashboardData } from "./types";
import RequestSummary from "./RequestSummary";
import { formatTimestamp } from "./utils";

type DashboardProps = {
  dashboard: DashboardData;
  onNewRequest: () => void;
  onOpenRequest: (requestId: number) => void;
};

export default function Dashboard({ dashboard, onNewRequest, onOpenRequest }: DashboardProps) {
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
          <span className="stat-hint">Not updated in 3+ days</span>
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
                <RequestSummary request={request} />
                <div className="meta">
                  Last worked by {request.updated_by.username} · {formatTimestamp(request.updated_at)}
                </div>
                {request.is_stale ? <div className="stale-badge">Stale</div> : null}
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
