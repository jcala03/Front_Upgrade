import type { TaskPriority, TaskStatus } from "../../../types/task";
import { formatCrmTimestamp } from "../../../utils/crmDateTime";
import { taskPriorityLabel, taskStatusLabel } from "../../../utils/crmPresentation";
import { StatusBadge, type StatusBadgeTone } from "../StatusBadge";
import "./TaskSummary.css";

type TaskTimingValue = {
  due_at: string | null;
  scheduled_starts_at: string | null;
  scheduled_ends_at: string | null;
};

const priorityTones: Record<TaskPriority, StatusBadgeTone> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

const statusTones: Record<TaskStatus, StatusBadgeTone> = {
  pending: "neutral",
  in_progress: "info",
  completed: "success",
  cancelled: "danger",
};

export const TaskBadges = ({ status, priority }: { status: TaskStatus; priority: TaskPriority }) => (
  <div className="task-summary__badges">
    <StatusBadge label={taskStatusLabel(status)} tone={statusTones[status]} />
    <StatusBadge label={taskPriorityLabel(priority)} tone={priorityTones[priority]} />
  </div>
);

export const TaskTiming = ({ task, compact = false }: { task: TaskTimingValue; compact?: boolean }) => (
  <dl className={`task-summary__timing ${compact ? "is-compact" : ""}`.trim()}>
    <div>
      <dt>Fecha límite</dt>
      <dd>{task.due_at ? formatCrmTimestamp(task.due_at) : "Sin fecha límite"}</dd>
    </div>
    <div>
      <dt>Programación</dt>
      <dd>{task.scheduled_starts_at && task.scheduled_ends_at
        ? `${formatCrmTimestamp(task.scheduled_starts_at)} – ${formatCrmTimestamp(task.scheduled_ends_at, { timeStyle: "short" })}`
        : "Sin bloque programado"}</dd>
    </div>
  </dl>
);
