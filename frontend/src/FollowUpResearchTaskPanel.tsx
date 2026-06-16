import { useState } from "react";
import { updateTask } from "./api";
import { FOLLOW_UP_DUE_DAYS } from "./formOptions";
import type { RequestTask, RequestWorkflow } from "./types";
import { formatTimestamp } from "./utils";
import {
  getFollowUpDueAt,
  getFollowUpLastReachedOutAt,
  isFollowUpTaskLate,
  TASK_STATUS_OPEN,
} from "./workflowForm";

type FollowUpResearchTaskPanelProps = {
  requestId: number;
  task: RequestTask;
  workflow: RequestWorkflow;
  disabled: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export default function FollowUpResearchTaskPanel({
  requestId,
  task,
  workflow,
  disabled,
  onChanged,
  onError,
}: FollowUpResearchTaskPanelProps) {
  const [recordingReachOut, setRecordingReachOut] = useState(false);
  const isLate = isFollowUpTaskLate(task, workflow);
  const lastReachedOutAt = getFollowUpLastReachedOutAt(task);
  const dueAt = getFollowUpDueAt(task, workflow);

  async function handleReachedOut() {
    setRecordingReachOut(true);
    onError("");
    try {
      await updateTask(requestId, task.id, { reached_out: true });
      await onChanged();
    } catch (reachOutError) {
      onError(reachOutError instanceof Error ? reachOutError.message : "Unable to record reach-out.");
    } finally {
      setRecordingReachOut(false);
    }
  }

  return (
    <div className="follow-up-research-task-panel">
      {isLate ? (
        <p className="status error follow-up-research-late-banner">
          This follow-up is overdue. The client has not responded yet — reach out now or record that you have
          contacted them.
        </p>
      ) : null}

      <div className="follow-up-research-task-summary">
        {dueAt ? (
          <p className={isLate ? "follow-up-research-due follow-up-research-due--late" : "follow-up-research-due"}>
            {isLate ? "Overdue since" : "Due"} {formatTimestamp(dueAt.toISOString())}
          </p>
        ) : (
          <p className="meta">
            Due date will be set to {FOLLOW_UP_DUE_DAYS} days after send research communication is marked done.
          </p>
        )}

        {lastReachedOutAt ? (
          <p className="meta">Last marked as reached out {formatTimestamp(lastReachedOutAt)}.</p>
        ) : null}
      </div>

      {!disabled && task.status === TASK_STATUS_OPEN ? (
        <button type="button" disabled={recordingReachOut} onClick={() => void handleReachedOut()}>
          {recordingReachOut ? "Saving..." : "Mark as reached out"}
        </button>
      ) : null}

      <p className="field-hint">
        Use this when you contacted the client but are still waiting for a decision. The due date moves forward{" "}
        {FOLLOW_UP_DUE_DAYS} days and this task stays open until you mark it done or record the client response.
      </p>
    </div>
  );
}
