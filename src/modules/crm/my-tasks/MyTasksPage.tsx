import { CheckCircle2, ClipboardList, Eye, Play, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { completeMyTask, getMyTask, getMyTasks, startMyTask } from "../../../api/myTasks";
import { CrmDialog } from "../../../components/crm/Dialog";
import { TaskBadges, TaskTiming } from "../../../components/crm/TaskSummary";
import type { MyTask, TaskPaginator, TaskPriority, TaskStatus } from "../../../types/task";
import {
  bogotaDateTimeLocalToTimestamp,
  formatCrmTimestamp,
} from "../../../utils/crmDateTime";
import { taskPriorityLabel, taskStatusLabel } from "../../../utils/crmPresentation";
import "./MyTasksPage.css";

const emptyTasks: TaskPaginator<MyTask> = {
  current_page: 1,
  data: [],
  last_page: 1,
  per_page: 20,
  total: 0,
};

const taskStatuses: TaskStatus[] = ["pending", "in_progress", "completed", "cancelled"];
const taskPriorities: TaskPriority[] = ["low", "normal", "high", "urgent"];

type TaskAction = "start" | "complete";
type ActionState = { taskId: number; action: TaskAction } | null;

const isAbortError = (cause: unknown) => cause instanceof DOMException && cause.name === "AbortError";

const descriptionSummary = (description: string | null) => {
  const normalized = description?.trim();
  if (!normalized) return "Sin descripción.";
  return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}…` : normalized;
};

const dateFilterTimestamp = (value: string, boundary: "start" | "end") => {
  if (!value) return undefined;
  if (boundary === "start") return bogotaDateTimeLocalToTimestamp(`${value}T00:00`) ?? undefined;
  return bogotaDateTimeLocalToTimestamp(`${value}T23:59:59`) ?? undefined;
};

export const MyTasksPage = () => {
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [page, setPage] = useState(1);
  const [tasks, setTasks] = useState<TaskPaginator<MyTask>>(emptyTasks);
  const [employeeLinked, setEmployeeLinked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MyTask | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionState, setActionState] = useState<ActionState>(null);
  const [actionError, setActionError] = useState("");
  const listRequestId = useRef(0);
  const listAbort = useRef<AbortController | null>(null);
  const detailRequestId = useRef(0);
  const detailAbort = useRef<AbortController | null>(null);
  const actionInFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    listAbort.current?.abort();
    listAbort.current = controller;
    const request = ++listRequestId.current;
    setLoading(true);
    setError("");

    getMyTasks({
      status: status || undefined,
      priority: priority || undefined,
      due_from: dateFilterTimestamp(dueFrom, "start"),
      due_to: dateFilterTimestamp(dueTo, "end"),
      page,
      per_page: 20,
    }, controller.signal)
      .then((result) => {
        if (request !== listRequestId.current) return;
        setEmployeeLinked(result.employee_linked);

        const lastPage = Math.max(1, result.tasks.last_page);
        if (result.employee_linked && page > lastPage) {
          setPage(lastPage);
          return;
        }

        setTasks(result.tasks);
      })
      .catch((cause) => {
        if (!isAbortError(cause) && request === listRequestId.current) {
          setTasks({ ...emptyTasks, current_page: page });
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar tus tareas.");
        }
      })
      .finally(() => {
        if (request === listRequestId.current) setLoading(false);
      });

    return () => controller.abort();
  }, [dueFrom, dueTo, page, priority, refreshVersion, status]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      listAbort.current?.abort();
      detailAbort.current?.abort();
    };
  }, []);

  const loadDetail = async (id: number) => {
    detailAbort.current?.abort();
    const controller = new AbortController();
    detailAbort.current = controller;
    const request = ++detailRequestId.current;
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const task = await getMyTask(id, controller.signal);
      if (request === detailRequestId.current) setDetail(task);
    } catch (cause) {
      if (!isAbortError(cause) && request === detailRequestId.current) {
        setDetailError(cause instanceof Error ? cause.message : "No se pudo cargar la tarea.");
      }
    } finally {
      if (request === detailRequestId.current) {
        setDetailLoading(false);
        detailAbort.current = null;
      }
    }
  };

  const openDetail = (id: number) => {
    setFeedback("");
    setActionError("");
    setDetailTaskId(id);
    void loadDetail(id);
  };

  const closeDetail = () => {
    if (actionInFlight.current) return;
    detailAbort.current?.abort();
    detailAbort.current = null;
    detailRequestId.current += 1;
    setDetailTaskId(null);
    setDetail(null);
    setDetailError("");
    setActionError("");
    setDetailLoading(false);
  };

  const runAction = async (task: MyTask, action: TaskAction) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActionState({ taskId: task.id, action });
    setActionError("");
    setFeedback("");

    try {
      const updated = action === "start"
        ? await startMyTask(task.id)
        : await completeMyTask(task.id);

      if (!mounted.current) return;

      setTasks((current) => ({
        ...current,
        data: current.data.map((item) => item.id === updated.id ? updated : item),
      }));
      setDetail((current) => current?.id === updated.id ? updated : current);
      setFeedback(action === "start" ? "Tarea iniciada correctamente." : "Tarea completada correctamente.");
      setRefreshVersion((current) => current + 1);
    } catch (cause) {
      if (mounted.current) setActionError(cause instanceof Error ? cause.message : "No se pudo actualizar la tarea.");
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setActionState(null);
    }
  };

  const clearFilters = () => {
    setFeedback("");
    setActionError("");
    setStatus("");
    setPriority("");
    setDueFrom("");
    setDueTo("");
    setPage(1);
  };

  const hasFilters = Boolean(status || priority || dueFrom || dueTo);

  return (
    <section className="my-tasks" aria-labelledby="my-tasks-title">
      <header className="my-tasks__header">
        <div>
          <span>Mi espacio</span>
          <h2 id="my-tasks-title">Mis tareas</h2>
          <p>Consulta tus pendientes y registra su avance.</p>
        </div>
      </header>

      {employeeLinked === true ? <section className="my-tasks__filters" aria-labelledby="my-task-filters-title">
        <div className="my-tasks__filter-heading">
          <h3 id="my-task-filters-title">Filtros</h3>
          {hasFilters ? <button type="button" onClick={clearFilters}>Limpiar</button> : null}
        </div>
        <div className="my-tasks__filter-grid">
          <label>
            <span>Estado</span>
            <select value={status} onChange={(event) => { setFeedback(""); setActionError(""); setStatus(event.target.value as TaskStatus | ""); setPage(1); }}>
              <option value="">Todos</option>
              {taskStatuses.map((value) => <option key={value} value={value}>{taskStatusLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span>Prioridad</span>
            <select value={priority} onChange={(event) => { setFeedback(""); setActionError(""); setPriority(event.target.value as TaskPriority | ""); setPage(1); }}>
              <option value="">Todas</option>
              {taskPriorities.map((value) => <option key={value} value={value}>{taskPriorityLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span>Vencen desde</span>
            <input
              type="date"
              value={dueFrom}
              onChange={(event) => {
                const next = event.target.value;
                setFeedback("");
                setActionError("");
                setDueFrom(next);
                if (dueTo && next && dueTo < next) setDueTo("");
                setPage(1);
              }}
            />
          </label>
          <label>
            <span>Vencen hasta</span>
            <input type="date" min={dueFrom} value={dueTo} onChange={(event) => { setFeedback(""); setActionError(""); setDueTo(event.target.value); setPage(1); }} />
          </label>
        </div>
      </section> : null}

      {feedback && detailTaskId === null ? <p className="my-tasks__feedback" role="status">{feedback}</p> : null}
      {actionError && detailTaskId === null ? <p className="my-tasks__feedback is-error" role="alert">{actionError}</p> : null}
      {error && tasks.data.length ? <div className="my-tasks__feedback is-error" role="alert"><span>{error}</span><button type="button" onClick={() => setRefreshVersion((current) => current + 1)}>Reintentar</button></div> : null}
      {loading && tasks.data.length ? <span className="sr-only" role="status">Actualizando tus tareas...</span> : null}

      {loading && employeeLinked === null ? <MyTasksState icon={<ClipboardList size={26} aria-hidden="true" />} status="Cargando tus tareas..." />
        : error && !tasks.data.length ? <MyTasksState title="No pudimos cargar tus tareas" description={error} retry={() => setRefreshVersion((current) => current + 1)} error />
          : employeeLinked === false ? <MyTasksState icon={<ClipboardList size={26} aria-hidden="true" />} title="Tu cuenta todavía no está vinculada a un empleado." description="Cuando tu cuenta sea vinculada, tus tareas asignadas aparecerán aquí." />
            : !loading && !tasks.data.length ? <MyTasksState icon={<CheckCircle2 size={27} aria-hidden="true" />} title={hasFilters ? "No hay tareas con estos filtros." : "Todavía no tienes tareas asignadas."} description={hasFilters ? "Prueba modificando o limpiando los filtros." : "Tus tareas nuevas aparecerán en este espacio."} />
              : employeeLinked ? <>
                <ul className={`my-tasks__list ${loading ? "is-updating" : ""}`} aria-label="Mis tareas">
                  {tasks.data.map((task) => <li key={task.id}><MyTaskCard task={task} busy={loading || Boolean(actionState)} actionState={actionState} onDetail={() => openDetail(task.id)} onAction={runAction} /></li>)}
                </ul>
                {tasks.last_page > 1 ? <nav className="my-tasks__pagination" aria-label="Paginación de mis tareas">
                  <button type="button" disabled={loading || tasks.current_page <= 1} onClick={() => { setFeedback(""); setActionError(""); setPage((current) => current - 1); }}>Anterior</button>
                  <span>Página {tasks.current_page} de {tasks.last_page}</span>
                  <button type="button" disabled={loading || tasks.current_page >= tasks.last_page} onClick={() => { setFeedback(""); setActionError(""); setPage((current) => current + 1); }}>Siguiente</button>
                </nav> : null}
              </> : null}

      <MyTaskDetailDialog
        taskId={detailTaskId}
        task={detail}
        loading={detailLoading}
        error={detailError}
        feedback={feedback}
        actionError={actionError}
        actionState={actionState}
        onRetry={() => { if (detailTaskId !== null) void loadDetail(detailTaskId); }}
        onClose={closeDetail}
        onAction={runAction}
      />
    </section>
  );
};

const MyTaskCard = ({ task, busy, actionState, onDetail, onAction }: {
  task: MyTask;
  busy: boolean;
  actionState: ActionState;
  onDetail: () => void;
  onAction: (task: MyTask, action: TaskAction) => Promise<void>;
}) => {
  const actionBusy = actionState?.taskId === task.id;

  return <article className={`my-task-card my-task-card--${task.status}`}>
    <header>
      <div className="my-task-card__title">
        <TaskBadges status={task.status} priority={task.priority} />
        <h3>{task.title}</h3>
      </div>
    </header>
    <p className="my-task-card__description">{descriptionSummary(task.description)}</p>
    <TaskTiming task={task} />
    <div className="my-task-card__actions">
      <button type="button" disabled={busy} onClick={onDetail}><Eye size={17} aria-hidden="true" />Ver detalle</button>
      {task.status === "pending" ? <button type="button" className="is-primary" disabled={busy} aria-busy={actionBusy && actionState?.action === "start"} onClick={() => void onAction(task, "start")}><Play size={17} aria-hidden="true" />{actionBusy && actionState?.action === "start" ? "Iniciando..." : "Iniciar"}</button> : null}
      {task.status === "pending" || task.status === "in_progress" ? <button type="button" className="is-success" disabled={busy} aria-busy={actionBusy && actionState?.action === "complete"} onClick={() => void onAction(task, "complete")}><CheckCircle2 size={17} aria-hidden="true" />{actionBusy && actionState?.action === "complete" ? "Completando..." : "Completar"}</button> : null}
    </div>
  </article>;
};

const MyTaskDetailDialog = ({ taskId, task, loading, error, feedback, actionError, actionState, onRetry, onClose, onAction }: {
  taskId: number | null;
  task: MyTask | null;
  loading: boolean;
  error: string;
  feedback: string;
  actionError: string;
  actionState: ActionState;
  onRetry: () => void;
  onClose: () => void;
  onAction: (task: MyTask, action: TaskAction) => Promise<void>;
}) => {
  const busy = Boolean(actionState);
  const actionBusy = task ? actionState?.taskId === task.id : false;

  return <CrmDialog open={taskId !== null} titleId="my-task-detail-title" onClose={onClose} busy={busy} className="my-task-detail-dialog">
    <article className="my-task-detail">
      <header>
        <div><span>Detalle operativo</span><h2 id="my-task-detail-title" data-dialog-initial tabIndex={-1}>{task?.title ?? (loading ? "Cargando tarea..." : "Detalle de tarea")}</h2></div>
        <button type="button" aria-label="Cerrar detalle" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>

      {loading ? <div className="my-task-detail__state" role="status">Cargando detalle...</div>
        : error ? <div className="my-task-detail__state is-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Reintentar</button></div>
          : task ? <div className="my-task-detail__body">
            <TaskBadges status={task.status} priority={task.priority} />
            {feedback ? <p className="my-task-detail__action-feedback" role="status">{feedback}</p> : null}
            {actionError ? <p className="my-task-detail__action-error" role="alert">{actionError}</p> : null}
            <section><h3>Descripción</h3><p>{task.description?.trim() || "Sin descripción."}</p></section>
            <TaskTiming task={task} />
            {task.started_at || task.completed_at || task.cancelled_at ? <dl className="my-task-detail__lifecycle">
              {task.started_at ? <div><dt>Iniciada</dt><dd>{formatCrmTimestamp(task.started_at)}</dd></div> : null}
              {task.completed_at ? <div><dt>Completada</dt><dd>{formatCrmTimestamp(task.completed_at)}</dd></div> : null}
              {task.cancelled_at ? <div><dt>Cancelada</dt><dd>{formatCrmTimestamp(task.cancelled_at)}</dd></div> : null}
            </dl> : null}
          </div> : null}

      {task && (task.status === "pending" || task.status === "in_progress") ? <footer>
        {task.status === "pending" ? <button type="button" disabled={busy} aria-busy={actionBusy && actionState?.action === "start"} onClick={() => void onAction(task, "start")}><Play size={17} aria-hidden="true" />{actionBusy && actionState?.action === "start" ? "Iniciando..." : "Iniciar"}</button> : null}
        <button type="button" className="is-success" disabled={busy} aria-busy={actionBusy && actionState?.action === "complete"} onClick={() => void onAction(task, "complete")}><CheckCircle2 size={17} aria-hidden="true" />{actionBusy && actionState?.action === "complete" ? "Completando..." : "Completar"}</button>
      </footer> : null}
    </article>
  </CrmDialog>;
};

const MyTasksState = ({ title, description, status, icon, retry, error = false }: {
  title?: string;
  description?: string;
  status?: string;
  icon?: ReactNode;
  retry?: () => void;
  error?: boolean;
}) => <div className={`my-tasks__state ${error ? "is-error" : ""}`} role={error ? "alert" : status ? "status" : undefined}>
  {icon}
  {title ? <strong>{title}</strong> : null}
  {description ? <p>{description}</p> : null}
  {status ? <span>{status}</span> : null}
  {retry ? <button type="button" onClick={retry}>Reintentar</button> : null}
</div>;
