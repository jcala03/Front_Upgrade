import {
  CheckCircle2,
  Eye,
  ListTodo,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { completeTask, getTask, getTasks, startTask } from "../../../api/tasks";
import { EmployeeSelector } from "../../../components/crm/EmployeeSelector";
import { TaskBadges, TaskTiming } from "../../../components/crm/TaskSummary";
import type { Employee } from "../../../types/employee";
import type { Task, TaskPaginator, TaskPriority, TaskStatus } from "../../../types/task";
import { hasPermission } from "../../../utils/authStorage";
import { bogotaDateTimeLocalToTimestamp } from "../../../utils/crmDateTime";
import { taskPriorityLabel, taskStatusLabel } from "../../../utils/crmPresentation";
import { TaskCancelDialog } from "./TaskCancelDialog";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { TaskFormDialog } from "./TaskFormDialog";
import "./AdminTasksPage.css";

type TaskAction = "start" | "complete";
type ActiveAction = { taskId: number; action: TaskAction } | null;

const statuses: TaskStatus[] = ["pending", "in_progress", "completed", "cancelled"];
const priorities: TaskPriority[] = ["low", "normal", "high", "urgent"];
const emptyResult: TaskPaginator = { current_page: 1, data: [], last_page: 1, per_page: 25, total: 0 };

const initialEmployeeId = () => {
  const raw = new URLSearchParams(window.location.search).get("employee_id");
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const filterTimestamp = (value: string) => value
  ? bogotaDateTimeLocalToTimestamp(value) ?? undefined
  : undefined;

export const AdminTasksPage = () => {
  const canCreate = hasPermission("tasks.create");
  const canUpdate = hasPermission("tasks.update");
  const canCancel = hasPermission("tasks.cancel");
  const canCheckAvailability = hasPermission("employee_availability.view");
  const [employeeId, setEmployeeId] = useState<number | null>(initialEmployeeId);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo, setScheduledTo] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<TaskPaginator>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formTask, setFormTask] = useState<Task | "new" | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailActionError, setDetailActionError] = useState("");
  const [detailVersion, setDetailVersion] = useState(0);
  const [cancelling, setCancelling] = useState<Task | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const actionInFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++listRequest.current;
    setLoading(true);
    setError("");

    void getTasks({
      employee_id: employeeId ?? undefined,
      search: search || undefined,
      status: status || undefined,
      priority: priority || undefined,
      due_from: filterTimestamp(dueFrom),
      due_to: filterTimestamp(dueTo),
      scheduled_from: filterTimestamp(scheduledFrom),
      scheduled_to: filterTimestamp(scheduledTo),
      page,
      per_page: 25,
    }, controller.signal)
      .then((data) => {
        if (request !== listRequest.current) return;
        const lastPage = Math.max(1, data.last_page);
        if (!data.data.length && page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult(data);
      })
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError") && request === listRequest.current) {
          setResult({ ...emptyResult, current_page: page });
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar las tareas.");
        }
      })
      .finally(() => {
        if (request === listRequest.current) setLoading(false);
      });

    return () => {
      controller.abort();
      listRequest.current += 1;
    };
  }, [dueFrom, dueTo, employeeId, page, priority, refreshVersion, scheduledFrom, scheduledTo, search, status]);

  useEffect(() => {
    if (detailId === null) {
      setDetail(null);
      setDetailError("");
      setDetailLoading(false);
      return;
    }

    const controller = new AbortController();
    const request = ++detailRequest.current;
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);

    void getTask(detailId, controller.signal)
      .then((task) => {
        if (request === detailRequest.current) setDetail(task);
      })
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError") && request === detailRequest.current) {
          setDetailError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle de la tarea.");
        }
      })
      .finally(() => {
        if (request === detailRequest.current) setDetailLoading(false);
      });

    return () => {
      controller.abort();
      detailRequest.current += 1;
    };
  }, [detailId, detailVersion]);

  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setSearch(draftSearch.trim());
    setPage(1);
  };

  const selectEmployee = (employee: Employee | null) => {
    const nextId = employee?.id ?? null;
    setEmployeeId(nextId);
    setPage(1);
    setMessage("");
    const url = new URL(window.location.href);
    if (nextId) url.searchParams.set("employee_id", String(nextId));
    else url.searchParams.delete("employee_id");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  const clearDates = () => {
    setDueFrom("");
    setDueTo("");
    setScheduledFrom("");
    setScheduledTo("");
    setPage(1);
  };

  const closeDetail = () => {
    if (actionInFlight.current) return;
    detailRequest.current += 1;
    setDetailId(null);
    setDetail(null);
    setDetailError("");
    setDetailActionError("");
    setDetailLoading(false);
  };

  const openDetail = (taskId: number) => {
    setMessage("");
    setError("");
    setDetailActionError("");
    setDetailId(taskId);
  };

  const saved = (feedback: string) => {
    setFormTask(null);
    setMessage(feedback);
    setError("");
    setRefreshVersion((current) => current + 1);
  };

  const runAction = async (task: Task, action: TaskAction) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActiveAction({ taskId: task.id, action });
    setError("");
    setDetailActionError("");
    setMessage("");
    try {
      const updated = action === "start" ? await startTask(task.id) : await completeTask(task.id);
      if (!mounted.current) return;
      setResult((current) => ({
        ...current,
        data: current.data.map((row) => row.id === updated.id ? updated : row),
      }));
      setDetail((current) => current?.id === updated.id ? updated : current);
      setMessage(action === "start" ? "Tarea iniciada correctamente." : "Tarea completada correctamente.");
      setRefreshVersion((current) => current + 1);
    } catch (cause) {
      const actionError = cause instanceof Error ? cause.message : `No se pudo ${action === "start" ? "iniciar" : "completar"} la tarea.`;
      if (mounted.current) {
        setError(actionError);
        if (detailId === task.id) setDetailActionError(actionError);
      }
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setActiveAction(null);
    }
  };

  const openEdit = (task: Task) => {
    closeDetail();
    setFormTask(task);
    setMessage("");
  };

  const openCancel = (task: Task) => {
    closeDetail();
    setCancelling(task);
    setMessage("");
  };

  const cancelled = () => {
    setCancelling(null);
    setMessage("Tarea cancelada correctamente.");
    setError("");
    setRefreshVersion((current) => current + 1);
  };

  const hasRows = result.data.length > 0;
  const activeDetailAction = activeAction?.taskId === detailId ? activeAction.action : null;

  return <section className="admin-tasks" aria-labelledby="admin-tasks-heading">
    <header className="admin-tasks__header">
      <div><span>Personal</span><h2 id="admin-tasks-heading">Tareas</h2><p>Asigna, programa y da seguimiento al trabajo operativo del equipo.</p></div>
      {canCreate ? <button className="is-primary" type="button" onClick={() => { setFormTask("new"); setMessage(""); }}><Plus size={18} aria-hidden="true" />Crear tarea</button> : null}
    </header>

    <form className="admin-tasks__filters" onSubmit={applySearch}>
      <label className="admin-tasks__search"><span>Buscar</span><div><Search size={16} aria-hidden="true" /><input type="search" maxLength={180} value={draftSearch} placeholder="Título o descripción" onChange={(event) => setDraftSearch(event.target.value)} /></div></label>
      <EmployeeSelector value={employeeId} onChange={selectEmployee} allowAll label="Empleado" />
      <label><span>Estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as TaskStatus | ""); setPage(1); setMessage(""); }}><option value="">Todos</option>{statuses.map((value) => <option key={value} value={value}>{taskStatusLabel(value)}</option>)}</select></label>
      <label><span>Prioridad</span><select value={priority} onChange={(event) => { setPriority(event.target.value as TaskPriority | ""); setPage(1); setMessage(""); }}><option value="">Todas</option>{priorities.map((value) => <option key={value} value={value}>{taskPriorityLabel(value)}</option>)}</select></label>
      <button type="submit" disabled={loading}><Search size={16} aria-hidden="true" />Aplicar</button>
      <button className="admin-tasks__advanced-toggle" type="button" aria-expanded={advancedOpen} aria-controls="admin-task-date-filters" onClick={() => setAdvancedOpen((current) => !current)}><SlidersHorizontal size={16} aria-hidden="true" />Fechas</button>
      {advancedOpen ? <fieldset id="admin-task-date-filters" className="admin-tasks__date-filters"><legend>Filtros avanzados de fecha y hora · Colombia</legend>
        <label><span>Límite desde</span><input type="datetime-local" value={dueFrom} max={dueTo || undefined} onChange={(event) => { const next = event.target.value; setDueFrom(next); if (dueTo && next && next > dueTo) setDueTo(""); setPage(1); }} /></label>
        <label><span>Límite hasta</span><input type="datetime-local" value={dueTo} min={dueFrom || undefined} onChange={(event) => { setDueTo(event.target.value); setPage(1); }} /></label>
        <label><span>Programada desde</span><input type="datetime-local" value={scheduledFrom} max={scheduledTo || undefined} onChange={(event) => { const next = event.target.value; setScheduledFrom(next); if (scheduledTo && next && next > scheduledTo) setScheduledTo(""); setPage(1); }} /></label>
        <label><span>Programada hasta</span><input type="datetime-local" value={scheduledTo} min={scheduledFrom || undefined} onChange={(event) => { setScheduledTo(event.target.value); setPage(1); }} /></label>
        <button type="button" disabled={!dueFrom && !dueTo && !scheduledFrom && !scheduledTo} onClick={clearDates}>Limpiar fechas</button>
      </fieldset> : null}
    </form>

    {message && detailId === null ? <p className="admin-tasks__feedback" role="status">{message}</p> : null}
    {error && detailId === null ? <div className="admin-tasks__feedback is-error" role="alert"><span>{error}</span><button type="button" onClick={() => setRefreshVersion((current) => current + 1)}>Reintentar</button></div> : null}
    {loading && hasRows ? <span className="sr-only" role="status">Actualizando tareas...</span> : null}

    {loading && !hasRows ? <div className="admin-tasks__state" role="status">Cargando tareas...</div>
      : error && !hasRows ? null
        : !loading && !hasRows ? <div className="admin-tasks__state"><ListTodo size={27} aria-hidden="true" /><strong>No hay tareas con estos filtros.</strong><p>El histórico continuará disponible cuando cambies los filtros.</p>{canCreate ? <button type="button" onClick={() => setFormTask("new")}>Crear tarea</button> : null}</div>
        : <>
          <div className={`admin-tasks__content ${loading ? "is-updating" : ""}`}>
            <div className="admin-tasks__table-wrap"><table><thead><tr><th>Tarea</th><th>Responsable</th><th>Estado / prioridad</th><th>Fechas</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{result.data.map((task) => <tr key={task.id}><td><strong>{task.title}</strong>{task.description ? <small>{task.description}</small> : null}</td><td>{task.employee?.name ?? `Empleado #${task.assigned_employee_id}`}</td><td><TaskBadges status={task.status} priority={task.priority} /></td><td><TaskTiming task={task} compact /></td><td><TaskActions task={task} canUpdate={canUpdate} canCancel={canCancel} busy={loading || Boolean(activeAction)} activeAction={activeAction?.taskId === task.id ? activeAction.action : null} onDetail={() => openDetail(task.id)} onEdit={() => openEdit(task)} onAction={(action) => void runAction(task, action)} onCancel={() => openCancel(task)} /></td></tr>)}</tbody></table></div>
            <div className="admin-tasks__cards">{result.data.map((task) => <article key={task.id}><header><div><span>{task.employee?.name ?? `Empleado #${task.assigned_employee_id}`}</span><h3>{task.title}</h3></div><TaskBadges status={task.status} priority={task.priority} /></header>{task.description ? <p>{task.description}</p> : null}<TaskTiming task={task} /><TaskActions task={task} canUpdate={canUpdate} canCancel={canCancel} busy={loading || Boolean(activeAction)} activeAction={activeAction?.taskId === task.id ? activeAction.action : null} onDetail={() => openDetail(task.id)} onEdit={() => openEdit(task)} onAction={(action) => void runAction(task, action)} onCancel={() => openCancel(task)} /></article>)}</div>
          </div>
          {result.last_page > 1 ? <nav className="admin-tasks__pagination" aria-label="Paginación de tareas"><button type="button" disabled={loading || result.current_page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</button><span>Página {result.current_page} de {result.last_page}</span><button type="button" disabled={loading || result.current_page >= result.last_page} onClick={() => setPage((current) => current + 1)}>Siguiente</button></nav> : null}
        </>}

    {formTask ? <TaskFormDialog key={formTask === "new" ? "new" : formTask.id} task={formTask === "new" ? null : formTask} initialEmployeeId={employeeId} canCheckAvailability={canCheckAvailability} onClose={() => setFormTask(null)} onSaved={saved} /> : null}
    <TaskDetailDialog taskId={detailId} task={detail} loading={detailLoading} error={detailError} actionError={detailActionError} feedback={detailId !== null ? message : ""} busyAction={activeDetailAction} canUpdate={canUpdate} canCancel={canCancel} onClose={closeDetail} onRetry={() => setDetailVersion((current) => current + 1)} onEdit={openEdit} onAction={(task, action) => void runAction(task, action)} onCancel={openCancel} />
    {cancelling ? <TaskCancelDialog key={cancelling.id} task={cancelling} onClose={() => setCancelling(null)} onCancelled={cancelled} /> : null}
  </section>;
};

const TaskActions = ({ task, canUpdate, canCancel, busy, activeAction, onDetail, onEdit, onAction, onCancel }: {
  task: Task;
  canUpdate: boolean;
  canCancel: boolean;
  busy: boolean;
  activeAction: TaskAction | null;
  onDetail: () => void;
  onEdit: () => void;
  onAction: (action: TaskAction) => void;
  onCancel: () => void;
}) => {
  const terminal = task.status === "completed" || task.status === "cancelled";
  return <div className="admin-task-actions">
    <button type="button" disabled={busy} onClick={onDetail}><Eye size={15} aria-hidden="true" />Ver</button>
    {!terminal && canUpdate ? <button type="button" disabled={busy} onClick={onEdit}><Pencil size={15} aria-hidden="true" />Editar</button> : null}
    {task.status === "pending" && canUpdate ? <button type="button" disabled={busy} aria-busy={activeAction === "start"} onClick={() => onAction("start")}><Play size={15} aria-hidden="true" />{activeAction === "start" ? "Iniciando..." : "Iniciar"}</button> : null}
    {(task.status === "pending" || task.status === "in_progress") && canUpdate ? <button className="is-success" type="button" disabled={busy} aria-busy={activeAction === "complete"} onClick={() => onAction("complete")}><CheckCircle2 size={15} aria-hidden="true" />{activeAction === "complete" ? "Completando..." : "Completar"}</button> : null}
    {!terminal && canCancel ? <button className="is-danger" type="button" disabled={busy} onClick={onCancel}><XCircle size={15} aria-hidden="true" />Cancelar</button> : null}
  </div>;
};
