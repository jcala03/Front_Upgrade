import {
  CheckCircle2,
  Eye,
  Filter,
  Flag,
  GaugeCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Target,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  cancelGoal,
  cancelMyGoal,
  completeGoal,
  completeMyGoal,
  createGoal,
  createMyGoal,
  getGoal,
  getGoals,
  getMyGoal,
  getMyGoals,
  updateGoal,
  updateGoalProgress,
  updateMyGoal,
  updateMyGoalProgress,
} from "../../api/goals";
import { listAllEmployees } from "../../api/employees";
import { ApiError } from "../../api/http";
import { CrmDialog } from "../../components/crm/Dialog";
import { StatusBadge, type StatusBadgeTone } from "../../components/crm/StatusBadge";
import type { Employee } from "../../types/employee";
import type {
  CreateAdminGoalPayload,
  CreateMyGoalPayload,
  Goal,
  GoalDefinitionPayload,
  GoalEffectiveStatus,
  GoalPaginator,
  GoalSource,
  GoalStatus,
  UpdateAdminGoalPayload,
  UpdateMyGoalPayload,
} from "../../types/goal";
import { formatCrmTimestamp, formatDateOnly } from "../../utils/crmDateTime";
import { decimalNumber, goalSourceLabel, goalStatusLabel } from "../../utils/crmPresentation";
import { hasPermission } from "../../utils/authStorage";
import "./GoalsPage.css";

type GoalsMode = "admin" | "my";
type GoalDialog = { kind: "create" } | { kind: "edit"; goal: Goal } | null;
type ProgressDialog = { goal: Goal } | null;
type CompleteDialog = { goal: Goal } | null;
type CancelDialog = { goal: Goal } | null;
type BusyAction = { goalId: number; action: "progress" | "complete" | "cancel" } | null;
type FieldErrors = Record<string, string[]>;

const sources: GoalSource[] = ["assigned", "personal"];
const statuses: GoalEffectiveStatus[] = ["active", "expired", "completed", "cancelled"];
const emptyGoals: GoalPaginator = { current_page: 1, data: [], last_page: 1, per_page: 25, total: 0 };

const isAbortError = (cause: unknown) => cause instanceof DOMException && cause.name === "AbortError";
const isActive = (goal: Goal) => goal.status === "active";
const safeEmployeeName = (goal: Goal) => goal.employee?.name ?? (goal.employee_id ? `Empleado #${goal.employee_id}` : "Empleado vinculado");
const trimOrNull = (value: string) => value.trim() || null;
const statusTone = (goal: Goal): StatusBadgeTone => {
  if (goal.effective_status === "expired") return "warning";
  if (goal.status === "completed") return "success";
  if (goal.status === "cancelled") return "danger";
  return "info";
};
const sourceTone = (source: GoalSource): StatusBadgeTone => source === "assigned" ? "neutral" : "info";
const formattedNumber = (value: string | number | null | undefined) => {
  const numeric = decimalNumber(value);
  return numeric === null ? "—" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(numeric);
};
const goalUnit = (goal: Goal) => goal.unit?.trim() ? ` ${goal.unit.trim()}` : "";
const compactDateRange = (goal: Goal) => {
  if (goal.starts_on && goal.due_on) return `${formatDateOnly(goal.starts_on)} – ${formatDateOnly(goal.due_on)}`;
  if (goal.starts_on) return `Desde ${formatDateOnly(goal.starts_on)}`;
  if (goal.due_on) return `Vence ${formatDateOnly(goal.due_on)}`;
  return "Sin fechas";
};

const goalPayload = (form: GoalFormState): GoalDefinitionPayload => ({
  title: form.title.trim(),
  description: trimOrNull(form.description),
  target_value: form.targetValue.trim() ? Number(form.targetValue) : null,
  unit: trimOrNull(form.unit),
  starts_on: form.startsOn || null,
  due_on: form.dueOn || null,
});

const firstFieldError = (errors: FieldErrors, field: string) => errors[field]?.[0] ?? null;

const updateGoalInPage = (page: GoalPaginator, goal: Goal) => ({
  ...page,
  data: page.data.map((item) => item.id === goal.id ? goal : item),
});

const hasGoalMutation = (busy: BusyAction, goal: Goal) => busy?.goalId === goal.id;

const canAdminEdit = (goal: Goal) => isActive(goal) && hasPermission("goals.update");
const canAdminProgress = (goal: Goal) => isActive(goal) && hasPermission("goals.update");
const canAdminComplete = (goal: Goal) => isActive(goal) && hasPermission("goals.update");
const canAdminCancel = (goal: Goal) => isActive(goal) && goal.source === "assigned" && hasPermission("goals.cancel");
const canMyEdit = (goal: Goal) => isActive(goal) && goal.source === "personal";
const canMyProgress = (goal: Goal) => isActive(goal);
const canMyComplete = (goal: Goal) => isActive(goal);
const canMyCancel = (goal: Goal) => isActive(goal) && goal.source === "personal";

const allowedActions = (mode: GoalsMode, goal: Goal) => ({
  edit: mode === "admin" ? canAdminEdit(goal) : canMyEdit(goal),
  progress: mode === "admin" ? canAdminProgress(goal) : canMyProgress(goal),
  complete: mode === "admin" ? canAdminComplete(goal) : canMyComplete(goal),
  cancel: mode === "admin" ? canAdminCancel(goal) : canMyCancel(goal),
});

const GoalState = ({ icon, title, description, status, retry, action, error = false }: {
  icon?: ReactNode;
  title?: string;
  description?: string;
  status?: string;
  retry?: () => void;
  action?: ReactNode;
  error?: boolean;
}) => <div className={`goals-state ${error ? "is-error" : ""}`} role={error ? "alert" : status ? "status" : undefined}>
  {icon}
  {title ? <strong>{title}</strong> : null}
  {description ? <p>{description}</p> : null}
  {status ? <span>{status}</span> : null}
  {retry ? <button type="button" onClick={retry}>Reintentar</button> : null}
  {action}
</div>;

const GoalProgress = ({ goal, compact = false }: { goal: Goal; compact?: boolean }) => {
  const current = decimalNumber(goal.current_value) ?? 0;
  const target = decimalNumber(goal.target_value);
  const rawPercent = target && target > 0 ? (current / target) * 100 : null;
  const displayedPercent = decimalNumber(goal.progress_percentage) ?? rawPercent;
  const unit = goalUnit(goal);

  if (!target || target <= 0) {
    return <div className="goal-progress goal-progress--manual-only">
      <span>{formattedNumber(goal.current_value)}{unit}</span>
      {!compact ? <small>Avance manual sin meta numérica.</small> : null}
    </div>;
  }

  return <div className="goal-progress">
    <div>
      <span>{formattedNumber(goal.current_value)} / {formattedNumber(goal.target_value)}{unit}</span>
      <strong>{displayedPercent === null ? "—" : `${formattedNumber(displayedPercent)}%`}</strong>
    </div>
    <div className="goal-progress__bar" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={current} aria-label={`Avance de ${goal.title}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, rawPercent ?? 0))}%` }} />
    </div>
  </div>;
};

const GoalBadges = ({ goal }: { goal: Goal }) => <div className="goal-badges">
  <StatusBadge label={goalStatusLabel(goal.effective_status)} tone={statusTone(goal)} />
  <StatusBadge label={goalSourceLabel(goal.source)} tone={sourceTone(goal.source)} />
  {goal.employee && goal.employee.is_active === false ? <StatusBadge label="Empleado inactivo" tone="warning" /> : null}
</div>;

const GoalActions = ({ mode, goal, busy, busyAction, onDetail, onEdit, onProgress, onComplete, onCancel }: {
  mode: GoalsMode;
  goal: Goal;
  busy: boolean;
  busyAction: BusyAction;
  onDetail: () => void;
  onEdit: () => void;
  onProgress: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) => {
  const actions = allowedActions(mode, goal);
  const actionBusy = hasGoalMutation(busyAction, goal);
  return <div className="goal-actions">
    <button type="button" disabled={busy} onClick={onDetail}><Eye size={15} aria-hidden="true" />Ver</button>
    {actions.edit ? <button type="button" disabled={busy} onClick={onEdit}><Pencil size={15} aria-hidden="true" />Editar</button> : null}
    {actions.progress ? <button type="button" disabled={busy} aria-busy={actionBusy && busyAction?.action === "progress"} onClick={onProgress}><GaugeCircle size={15} aria-hidden="true" />Avance</button> : null}
    {actions.complete ? <button className="is-success" type="button" disabled={busy} aria-busy={actionBusy && busyAction?.action === "complete"} onClick={onComplete}><CheckCircle2 size={15} aria-hidden="true" />Completar</button> : null}
    {actions.cancel ? <button className="is-danger" type="button" disabled={busy} aria-busy={actionBusy && busyAction?.action === "cancel"} onClick={onCancel}><XCircle size={15} aria-hidden="true" />Cancelar</button> : null}
  </div>;
};

type GoalFormState = {
  employeeId: string;
  title: string;
  description: string;
  targetValue: string;
  unit: string;
  startsOn: string;
  dueOn: string;
};

const formStateFromGoal = (goal: Goal | null, defaultEmployeeId = ""): GoalFormState => ({
  employeeId: goal?.employee_id ? String(goal.employee_id) : defaultEmployeeId,
  title: goal?.title ?? "",
  description: goal?.description ?? "",
  targetValue: goal?.target_value === null || goal?.target_value === undefined ? "" : String(goal.target_value),
  unit: goal?.unit ?? "",
  startsOn: goal?.starts_on ?? "",
  dueOn: goal?.due_on ?? "",
});

const GoalFormDialog = ({ mode, dialog, employees, loadingEmployees, onClose, onSaved }: {
  mode: GoalsMode;
  dialog: GoalDialog;
  employees: Employee[];
  loadingEmployees: boolean;
  onClose: () => void;
  onSaved: (goal: Goal, message: string) => void;
}) => {
  const editing = dialog?.kind === "edit" ? dialog.goal : null;
  const [form, setForm] = useState<GoalFormState>(() => formStateFromGoal(editing, employees[0] ? String(employees[0].id) : ""));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const admin = mode === "admin";
  const creating = dialog?.kind === "create";
  const assignedAdminEdit = admin && editing?.source === "assigned";
  const canChooseEmployee = admin && (creating || assignedAdminEdit);

  useEffect(() => {
    if (!form.employeeId && !editing && employees[0]) setForm((current) => ({ ...current, employeeId: String(employees[0].id) }));
  }, [editing, employees, form.employeeId]);

  if (!dialog) return null;

  const setField = (field: keyof GoalFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
    setGeneralError("");
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (!form.title.trim()) nextErrors.title = ["El título es obligatorio."];
    if (canChooseEmployee && !Number(form.employeeId)) nextErrors.employee_id = ["Selecciona un empleado."];
    if (form.targetValue.trim() && Number(form.targetValue) <= 0) nextErrors.target_value = ["La meta debe ser mayor que cero."];
    if (form.startsOn && form.dueOn && form.dueOn < form.startsOn) nextErrors.due_on = ["La fecha límite debe ser igual o posterior al inicio."];
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current || busy || !validate()) return;
    submitLock.current = true;
    setBusy(true);
    setGeneralError("");
    setErrors({});

    try {
      const definition = goalPayload(form);
      const saved = admin
        ? editing
          ? await updateGoal(editing.id, {
            ...(definition as UpdateAdminGoalPayload),
            ...(canChooseEmployee ? { employee_id: Number(form.employeeId) } : {}),
          })
          : await createGoal({ ...(definition as CreateAdminGoalPayload), employee_id: Number(form.employeeId) })
        : editing
          ? await updateMyGoal(editing.id, definition as UpdateMyGoalPayload)
          : await createMyGoal(definition as CreateMyGoalPayload);
      onSaved(saved, editing ? "Meta actualizada correctamente." : "Meta creada correctamente.");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.errors);
        setGeneralError(cause.message);
      } else {
        setGeneralError(cause instanceof Error ? cause.message : "No se pudo guardar la meta.");
      }
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  const title = editing ? "Editar meta" : (admin ? "Crear meta asignada" : "Crear meta personal");

  return <CrmDialog open titleId="goal-form-title" onClose={onClose} busy={busy} className="goal-dialog goal-form-dialog">
    <form className="goal-form" onSubmit={submit} noValidate>
      <header>
        <div><span>Metas manuales</span><h2 id="goal-form-title" data-dialog-initial tabIndex={-1}>{title}</h2></div>
        <button type="button" aria-label="Cerrar formulario" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>

      {generalError ? <p className="goal-form__error" role="alert">{generalError}</p> : null}

      <div className="goal-form__grid">
        {canChooseEmployee ? <label className="goal-form__wide"><span>Empleado</span><select value={form.employeeId} disabled={busy || loadingEmployees} onChange={(event) => setField("employeeId", event.target.value)}>
          <option value="">Selecciona un empleado</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}{employee.is_active ? "" : " · inactivo"}</option>)}
        </select>{firstFieldError(errors, "employee_id") ? <small role="alert">{firstFieldError(errors, "employee_id")}</small> : null}</label> : null}

        {admin && editing?.source === "personal" ? <p className="goal-form__note goal-form__wide">Meta personal de {safeEmployeeName(editing)}. El contrato actual no permite reasignarla.</p> : null}

        <label className="goal-form__wide"><span>Título</span><input type="text" maxLength={180} value={form.title} disabled={busy} onChange={(event) => setField("title", event.target.value)} />{firstFieldError(errors, "title") ? <small role="alert">{firstFieldError(errors, "title")}</small> : null}</label>
        <label className="goal-form__wide"><span>Descripción</span><textarea rows={4} value={form.description} disabled={busy} onChange={(event) => setField("description", event.target.value)} />{firstFieldError(errors, "description") ? <small role="alert">{firstFieldError(errors, "description")}</small> : null}</label>
        <label><span>Meta numérica</span><input type="number" min="0.01" step="0.01" value={form.targetValue} disabled={busy} placeholder="Opcional" onChange={(event) => setField("targetValue", event.target.value)} />{firstFieldError(errors, "target_value") ? <small role="alert">{firstFieldError(errors, "target_value")}</small> : null}</label>
        <label><span>Unidad</span><input type="text" maxLength={40} value={form.unit} disabled={busy} placeholder="ventas, %, horas" onChange={(event) => setField("unit", event.target.value)} />{firstFieldError(errors, "unit") ? <small role="alert">{firstFieldError(errors, "unit")}</small> : null}</label>
        <label><span>Inicia</span><input type="date" value={form.startsOn} max={form.dueOn || undefined} disabled={busy} onChange={(event) => setField("startsOn", event.target.value)} />{firstFieldError(errors, "starts_on") ? <small role="alert">{firstFieldError(errors, "starts_on")}</small> : null}</label>
        <label><span>Fecha límite</span><input type="date" value={form.dueOn} min={form.startsOn || undefined} disabled={busy} onChange={(event) => setField("dueOn", event.target.value)} />{firstFieldError(errors, "due_on") ? <small role="alert">{firstFieldError(errors, "due_on")}</small> : null}</label>
      </div>

      <footer>
        <button type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="is-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? "Guardando..." : "Guardar meta"}</button>
      </footer>
    </form>
  </CrmDialog>;
};

const ProgressDialog = ({ mode, dialog, onClose, onSaved }: { mode: GoalsMode; dialog: ProgressDialog; onClose: () => void; onSaved: (goal: Goal) => void }) => {
  const [value, setValue] = useState(() => dialog?.goal.current_value === undefined ? "" : String(dialog.goal.current_value));
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);

  if (!dialog) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (submitLock.current || busy) return;
    if (!trimmed || Number(trimmed) < 0) {
      setFieldError("El avance debe ser cero o mayor.");
      return;
    }
    submitLock.current = true;
    setBusy(true);
    setError("");
    setFieldError("");
    try {
      const saved = mode === "admin"
        ? await updateGoalProgress(dialog.goal.id, { current_value: Number(trimmed) })
        : await updateMyGoalProgress(dialog.goal.id, { current_value: Number(trimmed) });
      onSaved(saved);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldError(cause.errors.current_value?.[0] ?? "");
        setError(cause.message);
      } else {
        setError(cause instanceof Error ? cause.message : "No se pudo registrar el avance.");
      }
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  return <CrmDialog open titleId="goal-progress-title" onClose={onClose} busy={busy} className="goal-dialog goal-progress-dialog">
    <form className="goal-form" onSubmit={submit} noValidate>
      <header><div><span>Avance manual</span><h2 id="goal-progress-title" data-dialog-initial tabIndex={-1}>Actualizar avance</h2></div><button type="button" aria-label="Cerrar avance" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      <section className="goal-form__summary"><strong>{dialog.goal.title}</strong><GoalProgress goal={dialog.goal} /></section>
      {error ? <p className="goal-form__error" role="alert">{error}</p> : null}
      <label><span>Nuevo avance</span><input type="number" min="0" step="0.01" value={value} disabled={busy} onChange={(event) => { setValue(event.target.value); setFieldError(""); setError(""); }} />{fieldError ? <small role="alert">{fieldError}</small> : null}</label>
      <footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? "Guardando..." : "Registrar avance"}</button></footer>
    </form>
  </CrmDialog>;
};

const ConfirmCompleteDialog = ({ mode, dialog, onClose, onSaved }: { mode: GoalsMode; dialog: CompleteDialog; onClose: () => void; onSaved: (goal: Goal) => void }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  if (!dialog) return null;

  const submit = async () => {
    if (submitLock.current || busy) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = mode === "admin" ? await completeGoal(dialog.goal.id) : await completeMyGoal(dialog.goal.id);
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la meta.");
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  return <CrmDialog open titleId="goal-complete-title" onClose={onClose} busy={busy} className="goal-dialog goal-confirm-dialog">
    <article className="goal-confirm">
      <header><div><span>Cierre manual</span><h2 id="goal-complete-title" data-dialog-initial tabIndex={-1}>Completar meta</h2></div><button type="button" aria-label="Cerrar confirmación" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      <p>¿Marcar “{dialog.goal.title}” como completada? El backend no exige alcanzar la meta numérica para cerrar manualmente.</p>
      {error ? <p className="goal-form__error" role="alert">{error}</p> : null}
      <footer><button type="button" disabled={busy} onClick={onClose}>Volver</button><button className="is-success" type="button" disabled={busy} aria-busy={busy} onClick={() => void submit()}>{busy ? "Completando..." : "Completar"}</button></footer>
    </article>
  </CrmDialog>;
};

const CancelGoalDialog = ({ mode, dialog, onClose, onSaved }: { mode: GoalsMode; dialog: CancelDialog; onClose: () => void; onSaved: (goal: Goal) => void }) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const requiresReason = mode === "admin";
  if (!dialog) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current || busy) return;
    if (requiresReason && !reason.trim()) {
      setFieldError("La razón es obligatoria para cancelar metas asignadas.");
      return;
    }
    submitLock.current = true;
    setBusy(true);
    setError("");
    setFieldError("");
    try {
      const payload = reason.trim() ? { cancellation_reason: reason.trim() } : {};
      const saved = mode === "admin" ? await cancelGoal(dialog.goal.id, payload) : await cancelMyGoal(dialog.goal.id, payload);
      onSaved(saved);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldError(cause.errors.cancellation_reason?.[0] ?? "");
        setError(cause.message);
      } else {
        setError(cause instanceof Error ? cause.message : "No se pudo cancelar la meta.");
      }
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  return <CrmDialog open titleId="goal-cancel-title" onClose={onClose} busy={busy} className="goal-dialog goal-cancel-dialog">
    <form className="goal-form" onSubmit={submit} noValidate>
      <header><div><span>Cancelación</span><h2 id="goal-cancel-title" data-dialog-initial tabIndex={-1}>Cancelar meta</h2></div><button type="button" aria-label="Cerrar cancelación" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      <p>Vas a cancelar “{dialog.goal.title}”.</p>
      {error ? <p className="goal-form__error" role="alert">{error}</p> : null}
      <label><span>{requiresReason ? "Razón de cancelación" : "Razón de cancelación opcional"}</span><textarea rows={3} maxLength={255} value={reason} disabled={busy} onChange={(event) => { setReason(event.target.value); setFieldError(""); setError(""); }} />{fieldError ? <small role="alert">{fieldError}</small> : null}</label>
      <footer><button type="button" disabled={busy} onClick={onClose}>Volver</button><button className="is-danger" type="submit" disabled={busy} aria-busy={busy}>{busy ? "Cancelando..." : "Cancelar meta"}</button></footer>
    </form>
  </CrmDialog>;
};

const GoalDetailDialog = ({ mode, goalId, goal, loading, error, feedback, actionError, busyAction, onClose, onRetry, onEdit, onProgress, onComplete, onCancel }: {
  mode: GoalsMode;
  goalId: number | null;
  goal: Goal | null;
  loading: boolean;
  error: string;
  feedback: string;
  actionError: string;
  busyAction: BusyAction;
  onClose: () => void;
  onRetry: () => void;
  onEdit: (goal: Goal) => void;
  onProgress: (goal: Goal) => void;
  onComplete: (goal: Goal) => void;
  onCancel: (goal: Goal) => void;
}) => {
  const busy = Boolean(busyAction);
  const actions = goal ? allowedActions(mode, goal) : null;
  return <CrmDialog open={goalId !== null} titleId="goal-detail-title" onClose={onClose} busy={busy} className="goal-dialog goal-detail-dialog">
    <article className="goal-detail">
      <header><div><span>{mode === "admin" ? "Detalle administrativo" : "Detalle personal"}</span><h2 id="goal-detail-title" data-dialog-initial tabIndex={-1}>{goal?.title ?? (loading ? "Cargando meta..." : "Detalle de meta")}</h2></div><button type="button" aria-label="Cerrar detalle" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      {loading ? <GoalState status="Cargando detalle..." />
        : error ? <GoalState title="No pudimos cargar la meta" description={error} retry={onRetry} error />
          : goal ? <div className="goal-detail__body">
            <GoalBadges goal={goal} />
            {feedback ? <p className="goal-feedback" role="status">{feedback}</p> : null}
            {actionError ? <p className="goal-feedback is-error" role="alert">{actionError}</p> : null}
            <section><h3>Descripción</h3><p>{goal.description?.trim() || "Sin descripción."}</p></section>
            <section><h3>Avance</h3><GoalProgress goal={goal} /></section>
            <dl className="goal-detail__grid">
              <div><dt>Empleado</dt><dd>{safeEmployeeName(goal)}</dd></div>
              <div><dt>Origen</dt><dd>{goalSourceLabel(goal.source)}</dd></div>
              <div><dt>Inicio</dt><dd>{formatDateOnly(goal.starts_on)}</dd></div>
              <div><dt>Límite</dt><dd>{formatDateOnly(goal.due_on)}</dd></div>
              <div><dt>Creada</dt><dd>{formatCrmTimestamp(goal.created_at)}</dd></div>
              <div><dt>Actualizada</dt><dd>{formatCrmTimestamp(goal.updated_at)}</dd></div>
              {goal.completed_at ? <div><dt>Completada</dt><dd>{formatCrmTimestamp(goal.completed_at)}</dd></div> : null}
              {goal.cancelled_at ? <div><dt>Cancelada</dt><dd>{formatCrmTimestamp(goal.cancelled_at)}</dd></div> : null}
              {mode === "admin" && goal.creator ? <div><dt>Creada por</dt><dd>{goal.creator.name}</dd></div> : null}
              {mode === "admin" && goal.updater ? <div><dt>Actualizada por</dt><dd>{goal.updater.name}</dd></div> : null}
              {mode === "admin" && goal.cancellation_reason ? <div><dt>Razón de cancelación</dt><dd>{goal.cancellation_reason}</dd></div> : null}
            </dl>
          </div> : null}
      {goal && actions && (actions.edit || actions.progress || actions.complete || actions.cancel) ? <footer>
        {actions.edit ? <button type="button" disabled={busy} onClick={() => onEdit(goal)}><Pencil size={16} aria-hidden="true" />Editar</button> : null}
        {actions.progress ? <button type="button" disabled={busy} onClick={() => onProgress(goal)}><GaugeCircle size={16} aria-hidden="true" />Avance</button> : null}
        {actions.complete ? <button className="is-success" type="button" disabled={busy} onClick={() => onComplete(goal)}><CheckCircle2 size={16} aria-hidden="true" />Completar</button> : null}
        {actions.cancel ? <button className="is-danger" type="button" disabled={busy} onClick={() => onCancel(goal)}><XCircle size={16} aria-hidden="true" />Cancelar</button> : null}
      </footer> : null}
    </article>
  </CrmDialog>;
};

const GoalCard = ({ mode, goal, busy, busyAction, onDetail, onEdit, onProgress, onComplete, onCancel }: {
  mode: GoalsMode;
  goal: Goal;
  busy: boolean;
  busyAction: BusyAction;
  onDetail: () => void;
  onEdit: () => void;
  onProgress: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) => <article className={`goal-card goal-card--${goal.effective_status}`}>
  <header>
    <div><span>{safeEmployeeName(goal)}</span><h3>{goal.title}</h3></div>
    <GoalBadges goal={goal} />
  </header>
  {goal.description ? <p>{goal.description}</p> : null}
  <GoalProgress goal={goal} />
  <dl>
    <div><dt>Periodo</dt><dd>{compactDateRange(goal)}</dd></div>
  </dl>
  <GoalActions mode={mode} goal={goal} busy={busy} busyAction={busyAction} onDetail={onDetail} onEdit={onEdit} onProgress={onProgress} onComplete={onComplete} onCancel={onCancel} />
</article>;

export const GoalsPage = ({ mode }: { mode: GoalsMode }) => {
  const admin = mode === "admin";
  const canCreate = admin ? hasPermission("goals.create") : true;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(admin);
  const [employeesError, setEmployeesError] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [source, setSource] = useState<GoalSource | "">("");
  const [status, setStatus] = useState<GoalEffectiveStatus | "">("");
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [startsFrom, setStartsFrom] = useState("");
  const [startsTo, setStartsTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<GoalPaginator>(emptyGoals);
  const [employeeLinked, setEmployeeLinked] = useState<boolean | null>(admin ? true : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [formDialog, setFormDialog] = useState<GoalDialog>(null);
  const [progressDialog, setProgressDialog] = useState<ProgressDialog>(null);
  const [completeDialog, setCompleteDialog] = useState<CompleteDialog>(null);
  const [cancelDialog, setCancelDialog] = useState<CancelDialog>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Goal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailVersion, setDetailVersion] = useState(0);
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const listRequestId = useRef(0);
  const listAbort = useRef<AbortController | null>(null);
  const detailRequestId = useRef(0);
  const detailAbort = useRef<AbortController | null>(null);
  const actionLock = useRef(false);
  const mounted = useRef(true);

  const hasFilters = Boolean(employeeId || source || status || search || dueFrom || dueTo || startsFrom || startsTo);
  const hasRows = result.data.length > 0;
  const busy = loading || Boolean(busyAction);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      listAbort.current?.abort();
      detailAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!admin) return;
    const controller = new AbortController();
    setEmployeesLoading(true);
    setEmployeesError("");
    void listAllEmployees(controller.signal)
      .then(setEmployees)
      .catch((cause) => {
        if (!isAbortError(cause)) setEmployeesError(cause instanceof Error ? cause.message : "No se pudieron cargar empleados.");
      })
      .finally(() => setEmployeesLoading(false));
    return () => controller.abort();
  }, [admin]);

  useEffect(() => {
    const controller = new AbortController();
    listAbort.current?.abort();
    listAbort.current = controller;
    const request = ++listRequestId.current;
    setLoading(true);
    setError("");

    const filters = {
      employee_id: admin && employeeId ? Number(employeeId) : undefined,
      source: source || undefined,
      status: status || undefined,
      due_from: dueFrom || undefined,
      due_to: dueTo || undefined,
      starts_from: admin && startsFrom ? startsFrom : undefined,
      starts_to: admin && startsTo ? startsTo : undefined,
      search: search || undefined,
      page,
      per_page: 25,
    };

    const requestPromise = admin ? getGoals(filters, controller.signal) : getMyGoals(filters, controller.signal);

    void requestPromise
      .then((response) => {
        if (request !== listRequestId.current) return;
        const data = admin ? response as GoalPaginator : (response as Awaited<ReturnType<typeof getMyGoals>>).goals;
        if (!admin) setEmployeeLinked((response as Awaited<ReturnType<typeof getMyGoals>>).employee_linked);
        const lastPage = Math.max(1, data.last_page);
        if (page > lastPage && data.total > 0) {
          setPage(lastPage);
          return;
        }
        setResult(data);
      })
      .catch((cause) => {
        if (!isAbortError(cause) && request === listRequestId.current) {
          setResult({ ...emptyGoals, current_page: page });
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar las metas.");
        }
      })
      .finally(() => {
        if (request === listRequestId.current) setLoading(false);
      });

    return () => controller.abort();
  }, [admin, dueFrom, dueTo, employeeId, page, refreshVersion, search, source, startsFrom, startsTo, status]);

  useEffect(() => {
    if (detailId === null) {
      setDetail(null);
      setDetailLoading(false);
      setDetailError("");
      return;
    }
    const controller = new AbortController();
    detailAbort.current?.abort();
    detailAbort.current = controller;
    const request = ++detailRequestId.current;
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);

    void (admin ? getGoal(detailId, controller.signal) : getMyGoal(detailId, controller.signal))
      .then((goal) => { if (request === detailRequestId.current) setDetail(goal); })
      .catch((cause) => {
        if (!isAbortError(cause) && request === detailRequestId.current) setDetailError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle.");
      })
      .finally(() => {
        if (request === detailRequestId.current) {
          setDetailLoading(false);
          detailAbort.current = null;
        }
      });

    return () => {
      controller.abort();
      detailRequestId.current += 1;
    };
  }, [admin, detailId, detailVersion]);

  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setActionError("");
    setSearch(draftSearch.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setEmployeeId("");
    setSource("");
    setStatus("");
    setDraftSearch("");
    setSearch("");
    setDueFrom("");
    setDueTo("");
    setStartsFrom("");
    setStartsTo("");
    setPage(1);
    setMessage("");
    setActionError("");
  };

  const openDetail = (goalId: number) => {
    setMessage("");
    setActionError("");
    setDetailId(goalId);
  };

  const closeDetail = () => {
    if (actionLock.current) return;
    detailAbort.current?.abort();
    detailAbort.current = null;
    detailRequestId.current += 1;
    setDetailId(null);
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
    setActionError("");
  };

  const saved = (goal: Goal, feedback: string) => {
    setFormDialog(null);
    setResult((current) => current.data.some((item) => item.id === goal.id) ? updateGoalInPage(current, goal) : current);
    setDetail((current) => current?.id === goal.id ? goal : current);
    setMessage(feedback);
    setError("");
    setRefreshVersion((current) => current + 1);
  };

  const savedProgress = (goal: Goal) => {
    setProgressDialog(null);
    setResult((current) => updateGoalInPage(current, goal));
    setDetail((current) => current?.id === goal.id ? goal : current);
    setMessage("Avance actualizado correctamente.");
    setActionError("");
    setRefreshVersion((current) => current + 1);
  };

  const savedCompletion = (goal: Goal) => {
    setCompleteDialog(null);
    setResult((current) => updateGoalInPage(current, goal));
    setDetail((current) => current?.id === goal.id ? goal : current);
    setMessage("Meta completada correctamente.");
    setActionError("");
    setRefreshVersion((current) => current + 1);
  };

  const savedCancellation = (goal: Goal) => {
    setCancelDialog(null);
    setResult((current) => updateGoalInPage(current, goal));
    setDetail((current) => current?.id === goal.id ? goal : current);
    setMessage("Meta cancelada correctamente.");
    setActionError("");
    setRefreshVersion((current) => current + 1);
  };

  const openEdit = (goal: Goal) => {
    closeDetail();
    setFormDialog({ kind: "edit", goal });
  };

  const pageTitle = admin ? "Metas" : "Mis metas";
  const pageLead = admin ? "Crea y administra metas manuales por empleado." : "Consulta tus metas asignadas y registra avance manual.";
  const emptyTitle = admin ? "Aún no hay metas" : "Aún no tienes metas";
  const emptyDescription = hasFilters ? "Prueba cambiando o limpiando los filtros." : (admin ? "Crea la primera meta asignada a un empleado activo." : "Tus metas personales o asignadas aparecerán aquí.");
  const visibleFilters = admin || employeeLinked === true;

  const employeeOptions = useMemo(() => employees.map((employee) => ({ value: String(employee.id), label: `${employee.name}${employee.is_active ? "" : " · inactivo"}` })), [employees]);

  return <section className={`goals-page goals-page--${mode}`} aria-labelledby="goals-page-title">
    <header className="goals-page__header">
      <div><span>{admin ? "Personal" : "Mi espacio"}</span><h2 id="goals-page-title">{pageTitle}</h2><p>{pageLead}</p></div>
      {canCreate && employeeLinked !== false ? <button className="is-primary" type="button" onClick={() => { setFormDialog({ kind: "create" }); setMessage(""); }}><Plus size={18} aria-hidden="true" />{admin ? "Nueva meta" : "Crear meta personal"}</button> : null}
    </header>

    {visibleFilters ? <section className="goals-page__filter-shell" aria-labelledby="goals-filters-title">
      <div className="goals-page__filter-heading"><h3 id="goals-filters-title">Filtros</h3><div>{hasFilters ? <button type="button" onClick={clearFilters}>Limpiar</button> : null}<button className="goals-page__mobile-filter" type="button" aria-expanded={filtersOpen} aria-controls="goals-filter-panel" onClick={() => setFiltersOpen((current) => !current)}><Filter size={16} aria-hidden="true" />Filtrar</button></div></div>
      <form id="goals-filter-panel" className={`goals-page__filters ${filtersOpen ? "is-open" : ""}`} onSubmit={applySearch}>
        <label className="goals-page__search"><span>Buscar</span><div><Search size={16} aria-hidden="true" /><input type="search" maxLength={180} value={draftSearch} placeholder="Título o descripción" onChange={(event) => setDraftSearch(event.target.value)} /></div></label>
        {admin ? <label><span>Empleado</span><select value={employeeId} disabled={employeesLoading} onChange={(event) => { setEmployeeId(event.target.value); setPage(1); }}><option value="">Todos</option>{employeeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
        <label><span>Origen</span><select value={source} onChange={(event) => { setSource(event.target.value as GoalSource | ""); setPage(1); }}><option value="">Todos</option>{sources.map((value) => <option key={value} value={value}>{goalSourceLabel(value)}</option>)}</select></label>
        <label><span>Estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as GoalEffectiveStatus | ""); setPage(1); }}><option value="">Todos</option>{statuses.map((value) => <option key={value} value={value}>{goalStatusLabel(value)}</option>)}</select></label>
        <label><span>Vencen desde</span><input type="date" value={dueFrom} max={dueTo || undefined} onChange={(event) => { const next = event.target.value; setDueFrom(next); if (dueTo && next && dueTo < next) setDueTo(""); setPage(1); }} /></label>
        <label><span>Vencen hasta</span><input type="date" value={dueTo} min={dueFrom || undefined} onChange={(event) => { setDueTo(event.target.value); setPage(1); }} /></label>
        {admin ? <><label><span>Inician desde</span><input type="date" value={startsFrom} max={startsTo || undefined} onChange={(event) => { const next = event.target.value; setStartsFrom(next); if (startsTo && next && startsTo < next) setStartsTo(""); setPage(1); }} /></label><label><span>Inician hasta</span><input type="date" value={startsTo} min={startsFrom || undefined} onChange={(event) => { setStartsTo(event.target.value); setPage(1); }} /></label></> : null}
        <button type="submit" disabled={loading}><Search size={16} aria-hidden="true" />Aplicar</button>
      </form>
      {employeesError ? <p className="goals-page__subtle-error" role="alert">{employeesError}</p> : null}
    </section> : null}

    {message && detailId === null ? <p className="goal-feedback" role="status">{message}</p> : null}
    {actionError && detailId === null ? <p className="goal-feedback is-error" role="alert">{actionError}</p> : null}
    {error && hasRows ? <div className="goal-feedback is-error" role="alert"><span>{error}</span><button type="button" onClick={() => setRefreshVersion((current) => current + 1)}>Reintentar</button></div> : null}
    {loading && hasRows ? <span className="sr-only" role="status">Actualizando metas...</span> : null}

    {loading && !hasRows && employeeLinked !== false ? <GoalState icon={<Target size={28} aria-hidden="true" />} status="Cargando metas..." />
      : error && !hasRows ? <GoalState title="No pudimos cargar las metas" description={error} retry={() => setRefreshVersion((current) => current + 1)} error />
        : employeeLinked === false ? <GoalState icon={<UserRound size={28} aria-hidden="true" />} title="Tu cuenta todavía no está vinculada a un empleado." description="Cuando tu cuenta esté vinculada, tus metas aparecerán aquí." />
          : !loading && !hasRows ? <GoalState icon={<Flag size={28} aria-hidden="true" />} title={emptyTitle} description={emptyDescription} action={!hasFilters && canCreate ? <button type="button" onClick={() => setFormDialog({ kind: "create" })}>{admin ? "Nueva meta" : "Crear meta personal"}</button> : null} />
            : <>
              <div className={`goals-page__content ${loading ? "is-updating" : ""}`}>
                <div className="goals-page__table-wrap"><table><thead><tr><th>Meta</th>{admin ? <th>Empleado</th> : null}<th>Estado / origen</th><th>Avance</th><th>Periodo</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{result.data.map((goal) => <tr key={goal.id}><td><strong>{goal.title}</strong>{goal.description ? <small>{goal.description}</small> : null}</td>{admin ? <td>{safeEmployeeName(goal)}{goal.employee?.is_active === false ? <small>Inactivo</small> : null}</td> : null}<td><GoalBadges goal={goal} /></td><td><GoalProgress goal={goal} compact /></td><td>{compactDateRange(goal)}</td><td><GoalActions mode={mode} goal={goal} busy={busy} busyAction={busyAction} onDetail={() => openDetail(goal.id)} onEdit={() => openEdit(goal)} onProgress={() => setProgressDialog({ goal })} onComplete={() => setCompleteDialog({ goal })} onCancel={() => setCancelDialog({ goal })} /></td></tr>)}</tbody></table></div>
                <div className="goals-page__cards">{result.data.map((goal) => <GoalCard key={goal.id} mode={mode} goal={goal} busy={busy} busyAction={busyAction} onDetail={() => openDetail(goal.id)} onEdit={() => openEdit(goal)} onProgress={() => setProgressDialog({ goal })} onComplete={() => setCompleteDialog({ goal })} onCancel={() => setCancelDialog({ goal })} />)}</div>
              </div>
              {result.last_page > 1 ? <nav className="goals-page__pagination" aria-label="Paginación de metas"><button type="button" disabled={loading || result.current_page <= 1} onClick={() => { setPage((current) => current - 1); setMessage(""); }}>Anterior</button><span>Página {result.current_page} de {result.last_page}</span><button type="button" disabled={loading || result.current_page >= result.last_page} onClick={() => { setPage((current) => current + 1); setMessage(""); }}>Siguiente</button></nav> : null}
            </>}

    <GoalFormDialog mode={mode} dialog={formDialog} employees={employees} loadingEmployees={employeesLoading} onClose={() => setFormDialog(null)} onSaved={saved} />
    <ProgressDialog mode={mode} dialog={progressDialog} onClose={() => setProgressDialog(null)} onSaved={savedProgress} />
    <ConfirmCompleteDialog mode={mode} dialog={completeDialog} onClose={() => setCompleteDialog(null)} onSaved={savedCompletion} />
    <CancelGoalDialog mode={mode} dialog={cancelDialog} onClose={() => setCancelDialog(null)} onSaved={savedCancellation} />
    <GoalDetailDialog
      mode={mode}
      goalId={detailId}
      goal={detail}
      loading={detailLoading}
      error={detailError}
      feedback={detailId !== null ? message : ""}
      actionError={actionError}
      busyAction={busyAction}
      onClose={closeDetail}
      onRetry={() => setDetailVersion((current) => current + 1)}
      onEdit={openEdit}
      onProgress={(goal) => setProgressDialog({ goal })}
      onComplete={(goal) => setCompleteDialog({ goal })}
      onCancel={(goal) => setCancelDialog({ goal })}
    />
  </section>;
};

export const AdminGoalsPage = () => <GoalsPage mode="admin" />;
export const MyGoalsPage = () => <GoalsPage mode="my" />;
