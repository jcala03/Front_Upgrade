import { CheckCircle2, Pencil, Play, X, XCircle } from "lucide-react";
import { CrmDialog } from "../../../components/crm/Dialog";
import { TaskBadges, TaskTiming } from "../../../components/crm/TaskSummary";
import type { Task } from "../../../types/task";
import { formatCrmTimestamp } from "../../../utils/crmDateTime";

type TaskAction = "start" | "complete";

export const TaskDetailDialog = ({ taskId, task, loading, error, actionError, feedback, busyAction, canUpdate, canCancel, onClose, onRetry, onEdit, onAction, onCancel }: {
  taskId: number | null;
  task: Task | null;
  loading: boolean;
  error: string;
  actionError: string;
  feedback: string;
  busyAction: TaskAction | null;
  canUpdate: boolean;
  canCancel: boolean;
  onClose: () => void;
  onRetry: () => void;
  onEdit: (task: Task) => void;
  onAction: (task: Task, action: TaskAction) => void;
  onCancel: (task: Task) => void;
}) => {
  const terminal = task?.status === "completed" || task?.status === "cancelled";
  const busy = busyAction !== null;

  return <CrmDialog open={taskId !== null} titleId="admin-task-detail-title" onClose={onClose} busy={busy} className="admin-task-detail-dialog">
    <article className="admin-task-detail">
      <header><div><span>Detalle administrativo</span><h2 id="admin-task-detail-title" data-dialog-initial tabIndex={-1}>{task?.title ?? (loading ? "Cargando tarea..." : "Detalle de tarea")}</h2></div><button type="button" aria-label="Cerrar detalle" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      {loading ? <div className="admin-task-detail__state" role="status">Cargando detalle...</div>
        : error ? <div className="admin-task-detail__state is-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Reintentar</button></div>
          : task ? <div className="admin-task-detail__body">
            <div className="admin-task-detail__lead"><div><span>Responsable</span><strong>{task.employee?.name ?? `Empleado #${task.assigned_employee_id}`}</strong></div><TaskBadges status={task.status} priority={task.priority} /></div>
            {feedback ? <p className="admin-task-detail__feedback" role="status">{feedback}</p> : null}
            {actionError ? <p className="admin-task-detail__action-error" role="alert">{actionError}</p> : null}
            <section><h3>Descripción</h3><p>{task.description?.trim() || "Sin descripción."}</p></section>
            <TaskTiming task={task} />
            {task.availability_override ? <section className="admin-task-detail__override"><h3>Override fuera de horario</h3><p>{task.availability_override_reason || "Sin motivo visible."}</p>{task.availability_overridden_at ? <small>Registrado {formatCrmTimestamp(task.availability_overridden_at)}</small> : null}</section> : null}
            {task.cancellation_reason ? <section className="admin-task-detail__cancel"><h3>Motivo de cancelación</h3><p>{task.cancellation_reason}</p></section> : null}
            {task.started_at || task.completed_at || task.cancelled_at ? <dl className="admin-task-detail__lifecycle">
              {task.started_at ? <div><dt>Iniciada</dt><dd>{formatCrmTimestamp(task.started_at)}</dd></div> : null}
              {task.completed_at ? <div><dt>Completada</dt><dd>{formatCrmTimestamp(task.completed_at)}</dd></div> : null}
              {task.cancelled_at ? <div><dt>Cancelada</dt><dd>{formatCrmTimestamp(task.cancelled_at)}</dd></div> : null}
            </dl> : null}
          </div> : null}
      {task && !terminal ? <footer>
        {canUpdate ? <button type="button" disabled={busy} onClick={() => onEdit(task)}><Pencil size={16} aria-hidden="true" />Editar</button> : null}
        {canUpdate && task.status === "pending" ? <button type="button" disabled={busy} aria-busy={busyAction === "start"} onClick={() => onAction(task, "start")}><Play size={16} aria-hidden="true" />{busyAction === "start" ? "Iniciando..." : "Iniciar"}</button> : null}
        {canUpdate && (task.status === "pending" || task.status === "in_progress") ? <button className="is-success" type="button" disabled={busy} aria-busy={busyAction === "complete"} onClick={() => onAction(task, "complete")}><CheckCircle2 size={16} aria-hidden="true" />{busyAction === "complete" ? "Completando..." : "Completar"}</button> : null}
        {canCancel ? <button className="is-danger" type="button" disabled={busy} onClick={() => onCancel(task)}><XCircle size={16} aria-hidden="true" />Cancelar</button> : null}
      </footer> : null}
    </article>
  </CrmDialog>;
};
