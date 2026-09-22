import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createEmployeeLeave, updateEmployeeLeave } from "../../../api/employeeLeaves";
import { ApiError } from "../../../api/http";
import { CrmDialog } from "../../../components/crm/Dialog";
import { EmployeeSelector } from "../../../components/crm/EmployeeSelector";
import type { EmployeeLeave, EmployeeLeaveType } from "../../../types/workforce";
import { bogotaDateTimeLocalToTimestamp, isDateTimeRangeValid, timestampToBogotaDateTimeLocal } from "../../../utils/crmDateTime";
import { leaveTypeLabel } from "../../../utils/crmPresentation";

const leaveTypes: EmployeeLeaveType[] = ["vacation", "permission", "sick_leave", "absence", "other"];
const nowLocal = () => timestampToBogotaDateTimeLocal(new Date().toISOString()) ?? "";
const hourLaterLocal = () => timestampToBogotaDateTimeLocal(new Date(Date.now() + 3_600_000).toISOString()) ?? "";

export const LeaveFormDialog = ({ leave, initialEmployeeId, onClose, onSaved }: { leave: EmployeeLeave | null; initialEmployeeId: number | null; onClose: () => void; onSaved: (message: string) => void }) => {
  const [employeeId, setEmployeeId] = useState<number | null>(leave?.employee_id ?? initialEmployeeId);
  const [type, setType] = useState<EmployeeLeaveType>(leave?.type ?? "vacation");
  const [startsAt, setStartsAt] = useState(timestampToBogotaDateTimeLocal(leave?.starts_at) ?? nowLocal());
  const [endsAt, setEndsAt] = useState(timestampToBogotaDateTimeLocal(leave?.ends_at) ?? hourLaterLocal());
  const [reason, setReason] = useState(leave?.reason ?? "");
  const [notes, setNotes] = useState(leave?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setErrors({});
    if (!employeeId) { setErrors({ employee_id: ["Selecciona un empleado."] }); return; }
    if (!isDateTimeRangeValid(startsAt, endsAt)) { setErrors({ ends_at: ["La fecha y hora final debe ser posterior al inicio."] }); return; }
    const startsTimestamp = bogotaDateTimeLocalToTimestamp(startsAt); const endsTimestamp = bogotaDateTimeLocalToTimestamp(endsAt);
    if (!startsTimestamp || !endsTimestamp) { setError("No se pudo interpretar el rango en hora de Colombia."); return; }
    setSaving(true);
    try {
      const payload = { employee_id: employeeId, type, starts_at: startsTimestamp, ends_at: endsTimestamp, reason: reason.trim() || null, notes: notes.trim() || null };
      if (leave) await updateEmployeeLeave(leave.id, payload); else await createEmployeeLeave(payload);
      onSaved(leave ? "Ausencia actualizada correctamente." : "Ausencia registrada correctamente.");
    } catch (cause) {
      if (cause instanceof ApiError) setErrors(cause.errors);
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la ausencia.");
    } finally { setSaving(false); }
  };
  const fieldError = (field: string) => errors[field]?.[0];

  return <CrmDialog open titleId="leave-form-title" onClose={onClose} busy={saving} className="leave-dialog"><form className="leave-form" onSubmit={submit} noValidate>
    <header><div><span>Ausencia aprobada</span><h2 id="leave-form-title" data-dialog-initial tabIndex={-1}>{leave ? "Editar ausencia" : "Registrar ausencia"}</h2></div><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    <div className="leave-form__body">
      <p className="leave-form__help">Esta acción registra directamente una ausencia aprobada; no envía una solicitud.</p>
      <EmployeeSelector value={employeeId} onChange={(employee) => setEmployeeId(employee?.id ?? null)} disabled={saving || Boolean(leave)} />{fieldError("employee_id") ? <small id="leave-employee-error" className="field-error" role="alert">{fieldError("employee_id")}</small> : null}
      <label><span>Tipo</span><select value={type} disabled={saving} aria-invalid={Boolean(fieldError("type"))} aria-describedby={fieldError("type") ? "leave-type-error" : undefined} onChange={(event) => setType(event.target.value as EmployeeLeaveType)}>{leaveTypes.map((value) => <option key={value} value={value}>{leaveTypeLabel(value)}</option>)}</select>{fieldError("type") ? <small id="leave-type-error" className="field-error">{fieldError("type")}</small> : null}</label>
      <div className="leave-form__grid"><label><span>Inicio · hora Colombia</span><input required type="datetime-local" value={startsAt} disabled={saving} aria-invalid={Boolean(fieldError("starts_at"))} aria-describedby={fieldError("starts_at") ? "leave-start-error" : undefined} onChange={(event) => setStartsAt(event.target.value)} />{fieldError("starts_at") ? <small id="leave-start-error" className="field-error">{fieldError("starts_at")}</small> : null}</label><label><span>Fin · hora Colombia</span><input required type="datetime-local" value={endsAt} disabled={saving} aria-invalid={Boolean(fieldError("ends_at"))} aria-describedby={fieldError("ends_at") ? "leave-end-error" : undefined} onChange={(event) => setEndsAt(event.target.value)} />{fieldError("ends_at") ? <small id="leave-end-error" className="field-error">{fieldError("ends_at")}</small> : null}</label></div>
      <label><span>Motivo</span><input maxLength={255} value={reason} disabled={saving} aria-invalid={Boolean(fieldError("reason"))} aria-describedby={fieldError("reason") ? "leave-reason-error" : undefined} onChange={(event) => setReason(event.target.value)} />{fieldError("reason") ? <small id="leave-reason-error" className="field-error">{fieldError("reason")}</small> : <small>Opcional.</small>}</label>
      <label><span>Notas administrativas</span><textarea value={notes} disabled={saving} aria-invalid={Boolean(fieldError("notes"))} aria-describedby={fieldError("notes") ? "leave-notes-error" : undefined} onChange={(event) => setNotes(event.target.value)} />{fieldError("notes") ? <small id="leave-notes-error" className="field-error">{fieldError("notes")}</small> : <small>Solo se muestran en este módulo administrativo.</small>}</label>
      {error ? <p className="leave-form__error" role="alert">{error}</p> : null}
    </div><footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar ausencia"}</button></footer>
  </form></CrmDialog>;
};
