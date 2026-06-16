import { useCallback, useMemo, useState } from "react";
import ChangeHistoryPanel from "./ChangeHistoryPanel";
import CompletedWorkflowTasksPanel, { collectCompletedWorkflowTasks } from "./CompletedWorkflowTasksPanel";
import type { RequestPassenger, RequestWorkflow } from "./types";

type HistoryTab = "changes" | "tasks";

type RequestHistorySectionProps = {
  requestId: number;
  passengers: RequestPassenger[];
  workflows: RequestWorkflow[];
};

export default function RequestHistorySection({
  requestId,
  passengers,
  workflows,
}: RequestHistorySectionProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>("changes");
  const [changeCount, setChangeCount] = useState<number | null>(null);

  const completedTaskCount = useMemo(() => collectCompletedWorkflowTasks(workflows).length, [workflows]);

  const handleEntryCountChange = useCallback((count: number) => {
    setChangeCount(count);
  }, []);

  const changeTabLabel =
    changeCount === null ? "Request change history" : `Request change history (${changeCount})`;

  return (
    <section className="section-card section-tabs-card request-history-section">
      <div className="section-tablist" role="tablist" aria-label="Request history">
        <button
          type="button"
          role="tab"
          id="request-history-tab-changes"
          aria-selected={activeTab === "changes"}
          aria-controls="request-history-panel-changes"
          className={`section-tab${activeTab === "changes" ? " is-active" : ""}`}
          onClick={() => setActiveTab("changes")}
        >
          {changeTabLabel}
        </button>
        <button
          type="button"
          role="tab"
          id="request-history-tab-tasks"
          aria-selected={activeTab === "tasks"}
          aria-controls="request-history-panel-tasks"
          className={`section-tab${activeTab === "tasks" ? " is-active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          Completed workflow tasks ({completedTaskCount})
        </button>
      </div>

      <div className="section-card-body section-tab-body">
        {activeTab === "changes" ? (
          <div
            role="tabpanel"
            id="request-history-panel-changes"
            aria-labelledby="request-history-tab-changes"
          >
            <ChangeHistoryPanel
              requestId={requestId}
              passengers={passengers}
              onEntryCountChange={handleEntryCountChange}
            />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="request-history-panel-tasks"
            aria-labelledby="request-history-tab-tasks"
          >
            <CompletedWorkflowTasksPanel workflows={workflows} />
          </div>
        )}
      </div>
    </section>
  );
}
