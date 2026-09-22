import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { getEmployeeAvailability } from "../../../api/employeeSchedules";
import { ApiError } from "../../../api/http";
import { createTask, updateTask } from "../../../api/tasks";
import { CrmDialog } from "../../../components/crm/Dialog";
import { EmployeeSelector } from "../../../components/crm/EmployeeSelector";
import type { Task, TaskPayload, TaskPriority, TaskUpdatePayload } from "../../../types/task";
import type { AvailabilityReasonCode } from "../../../types/workforce";
import {
  bogotaDateTimeLocalToTimestamp,
  isDateTimeRangeValid,
  isSameLocalDateTimeDay,
  timestampToBogotaDateTimeLocal,
} from "../../../utils/crmDateTime";
import { availabilityReasonLabel, taskPriorityLabel } from "../../../utils/crmPresentation";

const priorities: TaskPriority[] = ["low", "normal", "high", "urgent"];
const reasonCodes: AvailabilityReasonCode[] = [
  "inactive_employee",
  "outside_work_schedule",
  "no_work_schedule",
  "approved_leave",
  "task_overlap",
  "appointment_overlap",
];

type AvailabilityState =
  | { status: "idle" | "checking" | "available" | "skipped" | "permission" }
  | { status: "unavailable"; reasons: AvailabilityReasonCode[] }
  | { status: "error"; message: string };

const reasonsFromError = (error: ApiError) => {
  const metadataReasons = Array.isArray(error.metadata.reason_codes)
    ? error.metadata.reason_codes
    : [];
  const validationValues = Object.values(error.errors).flat();

  return [...new Set([...metadataReasons, ...validationValues].filter(
    (value): value is AvailabilityReasonCode =>
      typeof value === "string" && reasonCodes.includes(value as AvailabilityReasonCode),
  ))];
};

const nextHourDefaults = () => {
  const starts = timestampToBogotaDateTimeLocal(new Date().toISOString()) ?? "";
  const ends = timestampToBogotaDateTimeLocal(new Date(Date.now() + 3_600_000).toISOString()) ?? "";
  return { starts, ends };
};

export const TaskFormDialog = ({
  task,
  initialEmployeeId,
  canCheckAvailability,
  onClose,
  onSaved,
}: {
  task: Task | null;
  initialEmployeeId: number | null;
  canCheckAvailability: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) => {
  const defaults = useRef(nextHourDefaults());
  const hadSchedule = Boolean(task?.scheduled_starts_at && task?.scheduled_ends_at);
  const [employeeId, setEmployeeId] = useState<number | null>(task?.assigned_employee_id ?? initialEmployeeId);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "normal");
  const [dueAt, setDueAt] = useState(timestampToBogotaDateTimeLocal(task?.due_at) ?? "");
  const [scheduled, setScheduled] = useState(hadSchedule);
  const [scheduledStartsAt, setScheduledStartsAt] = useState(timestampToBogotaDateTimeLocal(task?.scheduled_starts_at) ?? defaults.current.starts);
  const [scheduledEndsAt, setScheduledEndsAt] = useState(timestampToBogotaDateTimeLocal(task?.scheduled_ends_at) ?? defaults.current.ends);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: "idle" });
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const availabilityRequest = useRef(0);

  const validScheduledRange = scheduled
    && Boolean(employeeId)
    && isDateTimeRangeValid(scheduledStartsAt, scheduledEndsAt)
    && isSameLocalDateTimeDay(scheduledStartsAt, scheduledEndsAt);
  const shouldPrecheck = !task || !hadSchedule || task.assigned_employee_id !== employeeId;

  useEffect(() => {
    const request = ++availabilityRequest.current;
    const controller = new AbortController();
    setOverride(false);
    setOverrideReason("");

    if (!scheduled || !employeeId || !validScheduledRange) {
      setAvailability({ status: "idle" });
      return () => controller.abort();
    }
    if (!canCheckAvailability) {
      setAvailability({ status: "permission" });
      return () => controller.abort();
    }
    // The general endpoint cannot exclude the current Task and would report a false self-overlap.
    if (!shouldPrecheck) {
      setAvailability({ status: "skipped" });
      return () => controller.abort();
    }

    setAvailability({ status: "checking" });
    const timeout = window.setTimeout(async () => {
      const startsAt = bogotaDateTimeLocalToTimestamp(scheduledStartsAt);
      const endsAt = bogotaDateTimeLocalToTimestamp(scheduledEndsAt);
      if (!startsAt || !endsAt) return;
      try {
        const results = await getEmployeeAvailability({ starts_at: startsAt, ends_at: endsAt, employee_ids: [employeeId] }, controller.signal);
        if (request !== availabilityRequest.current) return;
        const result = results.find((row) => row.employee.id === employeeId);
        if (!result) {
          setAvailability({ status: "error", message: "No se recibió disponibilidad para el empleado seleccionado." });
        } else if (result.available) {
          setAvailability({ status: "available" });
        } else {
          setAvailability({ status: "unavailable", reasons: result.reason_codes });
        }
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError") && request === availabilityRequest.current) {
          setAvailability({ status: "error", message: cause instanceof Error ? cause.message : "No se pudo consultar la disponibilidad." });
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      availabilityRequest.current += 1;
    };
  }, [canCheckAvailability, employeeId, scheduled, scheduledEndsAt, scheduledStartsAt, shouldPrecheck, validScheduledRange]);

  const fieldError = (field: string) => errors[field]?.[0];
  const outsideOnly = availability.status === "unavailable"
    && availability.reasons.length === 1
    && availability.reasons[0] === "outside_work_schedule";
  const hardBlocked = availability.status === "unavailable" && !outsideOnly;

  const resetAvailabilityDecision = () => {
    setAvailability({ status: "idle" });
    setOverride(false);
    setOverrideReason("");
  };

  const toggleScheduled = (checked: boolean) => {
    resetAvailabilityDecision();
    setScheduled(checked);
    if (!checked) {
      setScheduledStartsAt("");
      setScheduledEndsAt("");
      setOverride(false);
      setOverrideReason("");
    } else if (!scheduledStartsAt || !scheduledEndsAt) {
      const next = nextHourDefaults();
      setScheduledStartsAt(next.starts);
      setScheduledEndsAt(next.ends);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setErrors({});

    if (!employeeId) { setErrors({ assigned_employee_id: ["Selecciona un empleado responsable."] }); return; }
    if (!title.trim()) { setErrors({ title: ["El título es obligatorio."] }); return; }
    if (scheduled && (!scheduledStartsAt || !scheduledEndsAt)) { setErrors({ scheduled_ends_at: ["Completa el inicio y fin de la programación."] }); return; }
    if (scheduled && !isSameLocalDateTimeDay(scheduledStartsAt, scheduledEndsAt)) { setErrors({ scheduled_ends_at: ["La programación debe iniciar y terminar el mismo día en Colombia."] }); return; }
    if (scheduled && !isDateTimeRangeValid(scheduledStartsAt, scheduledEndsAt)) { setErrors({ scheduled_ends_at: ["El fin programado debe ser posterior al inicio."] }); return; }
    if (availability.status === "checking") { setError("Espera a que termine la consulta de disponibilidad."); return; }
    if (hardBlocked) { setError("El conflicto de disponibilidad indicado no admite programación forzada."); return; }
    if (outsideOnly && !override) { setError("Ajusta el horario o confirma explícitamente que deseas programar fuera de jornada."); return; }
    if (override && !overrideReason.trim()) { setErrors({ availability_override_reason: ["El motivo del override es obligatorio."] }); return; }

    const dueTimestamp = dueAt ? bogotaDateTimeLocalToTimestamp(dueAt) : null;
    const startsTimestamp = scheduled ? bogotaDateTimeLocalToTimestamp(scheduledStartsAt) : null;
    const endsTimestamp = scheduled ? bogotaDateTimeLocalToTimestamp(scheduledEndsAt) : null;
    if (dueAt && !dueTimestamp) { setErrors({ due_at: ["La fecha límite no es válida."] }); return; }
    if (scheduled && (!startsTimestamp || !endsTimestamp)) { setError("No se pudo interpretar la programación en hora de Colombia."); return; }

    const payload: TaskPayload = {
      assigned_employee_id: employeeId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_at: dueTimestamp,
      scheduled_starts_at: startsTimestamp,
      scheduled_ends_at: endsTimestamp,
      ...(override ? { availability_override: true as const, availability_override_reason: overrideReason.trim() } : {}),
    };

    setSaving(true);
    try {
      if (task) {
        const updatePayload: TaskUpdatePayload = {};
        const originalDueAt = timestampToBogotaDateTimeLocal(task.due_at) ?? "";
        const originalStartsAt = timestampToBogotaDateTimeLocal(task.scheduled_starts_at) ?? "";
        const originalEndsAt = timestampToBogotaDateTimeLocal(task.scheduled_ends_at) ?? "";
        const currentStartsAt = scheduled ? scheduledStartsAt : "";
        const currentEndsAt = scheduled ? scheduledEndsAt : "";
        const descriptionValue = description.trim() || null;

        if (employeeId !== task.assigned_employee_id) updatePayload.assigned_employee_id = employeeId;
        if (title.trim() !== task.title) updatePayload.title = title.trim();
        if (descriptionValue !== (task.description?.trim() || null)) updatePayload.description = descriptionValue;
        if (priority !== task.priority) updatePayload.priority = priority;
        if (dueAt !== originalDueAt) updatePayload.due_at = dueTimestamp;
        if (currentStartsAt !== originalStartsAt || currentEndsAt !== originalEndsAt) {
          updatePayload.scheduled_starts_at = startsTimestamp;
          updatePayload.scheduled_ends_at = endsTimestamp;
        }
        if (override) {
          updatePayload.availability_override = true;
          updatePayload.availability_override_reason = overrideReason.trim();
        }

        await updateTask(task.id, updatePayload);
      } else {
        await createTask(payload);
      }
      onSaved(task ? "Tarea actualizada correctamente." : "Tarea creada correctamente.");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.errors);
        const structuredReasons = reasonsFromError(cause);
        if (structuredReasons.length) setAvailability({ status: "unavailable", reasons: structuredReasons });
      }
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  return <CrmDialog open titleId="task-form-title" onClose={onClose} busy={saving} className="task-form-dialog">
    <form className="task-form" onSubmit={submit} noValidate aria-busy={saving}>
      <header><div><span>Asignación operativa</span><h2 id="task-form-title" data-dialog-initial tabIndex={-1}>{task ? "Editar tarea" : "Crear tarea"}</h2></div><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      <div className="task-form__body">
        <EmployeeSelector value={employeeId} onChange={(employee) => { resetAvailabilityDecision(); setEmployeeId(employee?.id ?? null); }} disabled={saving} label="Empleado responsable" validationError={fieldError("assigned_employee_id")} validationErrorId="task-employee-error" />
        <label><span>Título</span><input required maxLength={180} value={title} disabled={saving} aria-invalid={Boolean(fieldError("title"))} aria-describedby={fieldError("title") ? "task-title-error" : undefined} onChange={(event) => setTitle(event.target.value)} />{fieldError("title") ? <small id="task-title-error" className="task-field-error">{fieldError("title")}</small> : null}</label>
        <label><span>Descripción</span><textarea value={description} disabled={saving} aria-invalid={Boolean(fieldError("description"))} aria-describedby={fieldError("description") ? "task-description-error" : undefined} onChange={(event) => setDescription(event.target.value)} />{fieldError("description") ? <small id="task-description-error" className="task-field-error">{fieldError("description")}</small> : null}</label>
        <div className="task-form__grid"><label><span>Prioridad</span><select value={priority} disabled={saving} aria-invalid={Boolean(fieldError("priority"))} aria-describedby={fieldError("priority") ? "task-priority-error" : undefined} onChange={(event) => setPriority(event.target.value as TaskPriority)}>{priorities.map((value) => <option key={value} value={value}>{taskPriorityLabel(value)}</option>)}</select>{fieldError("priority") ? <small id="task-priority-error" className="task-field-error">{fieldError("priority")}</small> : null}</label><label><span>Fecha límite · Colombia</span><input type="datetime-local" value={dueAt} disabled={saving} aria-invalid={Boolean(fieldError("due_at"))} aria-describedby={fieldError("due_at") ? "task-due-error" : "task-due-help"} onChange={(event) => setDueAt(event.target.value)} />{fieldError("due_at") ? <small id="task-due-error" className="task-field-error">{fieldError("due_at")}</small> : <small id="task-due-help">Indica cuándo debería estar terminada. No reserva tiempo en la agenda.</small>}</label></div>
        <fieldset className="task-form__schedule"><legend>Programación</legend><label className="task-form__toggle"><input type="checkbox" checked={scheduled} disabled={saving} onChange={(event) => toggleScheduled(event.target.checked)} /><span>Programar en agenda</span></label>
          {scheduled ? <><div className="task-form__grid"><label><span>Inicio programado · Colombia</span><input required type="datetime-local" value={scheduledStartsAt} disabled={saving} aria-invalid={Boolean(fieldError("scheduled_starts_at"))} aria-describedby={fieldError("scheduled_starts_at") ? "task-scheduled-start-error" : undefined} onChange={(event) => { resetAvailabilityDecision(); setScheduledStartsAt(event.target.value); }} />{fieldError("scheduled_starts_at") ? <small id="task-scheduled-start-error" className="task-field-error">{fieldError("scheduled_starts_at")}</small> : null}</label><label><span>Fin programado · Colombia</span><input required type="datetime-local" value={scheduledEndsAt} disabled={saving} aria-invalid={Boolean(fieldError("scheduled_ends_at"))} aria-describedby={fieldError("scheduled_ends_at") ? "task-scheduled-end-error" : undefined} onChange={(event) => { resetAvailabilityDecision(); setScheduledEndsAt(event.target.value); }} />{fieldError("scheduled_ends_at") ? <small id="task-scheduled-end-error" className="task-field-error">{fieldError("scheduled_ends_at")}</small> : null}</label></div><AvailabilityBlock state={availability} outsideOnly={outsideOnly} override={override} overrideReason={overrideReason} disabled={saving} reasonError={fieldError("availability_override_reason")} onOverride={setOverride} onReason={setOverrideReason} /></> : <p className="task-form__help">Sin programación: la tarea no ocupará espacio en la agenda.</p>}
        </fieldset>
        {error ? <p className="task-form__error" role="alert">{error}</p> : null}
      </div>
      <footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving || availability.status === "checking"}>{saving ? "Guardando..." : "Guardar tarea"}</button></footer>
    </form>
  </CrmDialog>;
};

const AvailabilityBlock = ({ state, outsideOnly, override, overrideReason, disabled, reasonError, onOverride, onReason }: { state: AvailabilityState; outsideOnly: boolean; override: boolean; overrideReason: string; disabled: boolean; reasonError?: string; onOverride: (value: boolean) => void; onReason: (value: string) => void }) => {
  if (state.status === "idle") return <div className="task-availability is-neutral"><strong>Disponibilidad pendiente</strong><p>Completa un rango válido del mismo día para verificar al empleado.</p></div>;
  if (state.status === "checking") return <div className="task-availability is-neutral" role="status"><strong>Consultando disponibilidad…</strong></div>;
  if (state.status === "available") return <div className="task-availability is-available" role="status"><strong>Disponible</strong><p>Empleado disponible en este horario.</p></div>;
  if (state.status === "permission") return <div className="task-availability is-neutral" role="status"><strong>Validación al guardar</strong><p>El backend comprobará la disponibilidad al guardar la tarea.</p></div>;
  if (state.status === "skipped") return <div className="task-availability is-neutral" role="status"><strong>Validación al guardar</strong><p>Para evitar un falso conflicto con esta misma tarea, el backend validará el cambio mediante PATCH.</p></div>;
  if (state.status === "error") return <div className="task-availability is-error" role="alert"><strong>No se pudo consultar</strong><p>{state.message} El backend volverá a validar al guardar.</p></div>;
  if (state.status !== "unavailable") return null;

  return <div className={`task-availability ${outsideOnly ? "is-warning" : "is-blocked"}`} role="alert"><strong>No disponible</strong><ul>{state.reasons.map((reason) => <li key={reason}>{availabilityReasonLabel(reason)}</li>)}</ul>{outsideOnly ? <div className="task-availability__override"><label><input type="checkbox" checked={override} disabled={disabled} onChange={(event) => onOverride(event.target.checked)} /><span>Programar de todas formas</span></label>{override ? <label><span>Motivo</span><textarea required maxLength={255} value={overrideReason} disabled={disabled} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "task-override-reason-error" : undefined} onChange={(event) => onReason(event.target.value)} />{reasonError ? <small id="task-override-reason-error" className="task-field-error">{reasonError}</small> : null}</label> : null}</div> : <p>Este conflicto no admite override administrativo.</p>}</div>;
};
