import { useMemo } from "react";
import { TASK_STATUS_DONE } from "./formOptions";
import type { RequestTask, RequestWorkflow } from "./types";
import { formatTimestamp } from "./utils";
import { workflowTypeLabel } from "./workflowForm";

type CompletedWorkflowTaskEntry = {
  task: RequestTask;
  workflow: RequestWorkflow;
};

export function collectCompletedWorkflowTasks(workflows: RequestWorkflow[]): CompletedWorkflowTaskEntry[] {
  const entries: CompletedWorkflowTaskEntry[] = [];

  for (const workflow of workflows) {
    for (const task of workflow.tasks) {
      if (task.status === TASK_STATUS_DONE && task.completed_at) {
        entries.push({ task, workflow });
      }
    }
  }

  return entries.sort((left, right) => {
    const leftTime = left.task.completed_at ?? "";
    const rightTime = right.task.completed_at ?? "";
    return rightTime.localeCompare(leftTime);
  });
}

type CompletedWorkflowTasksPanelProps = {
  workflows: RequestWorkflow[];
};

export default function CompletedWorkflowTasksPanel({ workflows }: CompletedWorkflowTasksPanelProps) {
  const completedTasks = useMemo(() => collectCompletedWorkflowTasks(workflows), [workflows]);

  if (completedTasks.length === 0) {
    return <p className="meta">No workflow tasks completed yet.</p>;
  }

  return (
    <div className="completed-workflow-tasks-table-wrap">
      <table className="completed-workflow-tasks-table">
        <thead>
          <tr>
            <th scope="col">Completed</th>
            <th scope="col">Task</th>
            <th scope="col">Workflow</th>
            <th scope="col">Completed by</th>
          </tr>
        </thead>
        <tbody>
          {completedTasks.map(({ task, workflow }) => (
            <tr key={task.id}>
              <td className="meta">{formatTimestamp(task.completed_at!)}</td>
              <td>{task.title}</td>
              <td>
                {workflowTypeLabel(workflow.workflow_type)}
                <span className="meta completed-workflow-tasks-status"> · {workflow.status}</span>
              </td>
              <td className="meta">{task.completed_by?.username ?? "Unknown"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
