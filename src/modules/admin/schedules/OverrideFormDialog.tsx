import { useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { ApiError } from "../../../api/http";
import { createEmployeeScheduleOverride, updateEmployeeScheduleOverride } from "../../../api/employeeSchedules";
import { CrmDialog } from "../../../components/crm/Dialog";
import type { EmployeeScheduleOverride, EmployeeScheduleOverrideType } from "../../../types/workforce";
import { isTimeRangeValid, normalizeDateOnly, normalizeTimeOnly, timestampToBogotaDateTimeLocal } from "../../../utils/crmDateTime";

const today = () => timestampToBogotaDateTimeLocal(new Date().toISOString())?.slice(0, 10) ?? "";

export const OverrideFormDialog = ({ employeeId, override, existing, onClose, onSaved, onEditExisting }: { employeeId: number; override: EmployeeScheduleOverride | null; existing: EmployeeScheduleOverride[]; onClose: () => void; onSaved: (message: string) => void; onEditExisting: (override: EmployeeScheduleOverride) => void }) => {
  const [date, setDate] = useState(normalizeDateOnly(override?.date) ?? today());
  const [type, setType] = useState<EmployeeScheduleOverrideType>(override?.type ?? "working");
  const [startsAt, setStartsAt] = useState(normalizeTimeOnly(override?.starts_at) ?? "08:00");
  const [endsAt, setEndsAt] = useState(normalizeTimeOnly(override?.ends_at) ?? "17:00");
  const [reason, setReason] = useState(override?.reason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const duplicate = useMemo(() => existing.find((item) => item.date.slice(0, 10) === date && item.id !== override?.id), [date, existing, override?.id]);

  const changeType = (next: EmployeeScheduleOverrideType) => { setType(next); if (next === "non_working") { setStartsAt(""); setEndsAt(""); } else { setStartsAt("08:00"); setEndsAt("17:00"); } };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setErrors({});
    if (duplicate) { setErrors({ date: ["Ya existe una excepción para este empleado y fecha."] }); return; }
    if (type === "working" && !isTimeRangeValid(startsAt, endsAt)) { setErrors({ ends_at: ["La hora de fin debe ser posterior a la hora de inicio."] }); return; }
    setSaving(true);
    try {
      const payload = { date, type, starts_at: type === "working" ? startsAt : null, ends_at: type === "working" ? endsAt : null, reason: reason.trim() || null };
      if (override) await updateEmployeeScheduleOverride(override.id, payload);
      else await createEmployeeScheduleOverride({ employee_id: employeeId, ...payload });
      onSaved(override ? "Excepción actualizada correctamente." : "Excepción agregada correctamente.");
    } catch (cause) {
      if (cause instanceof ApiError) setErrors(cause.errors);
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la excepción.");
    } finally { setSaving(false); }
  };
  const fieldError = (field: string) => errors[field]?.[0];

  return <CrmDialog open titleId="override-form-title" onClose={onClose} busy={saving} className="workforce-dialog"><form className="workforce-form" onSubmit={submit} noValidate>
    <header><div><span>Excepción de fecha</span><h2 id="override-form-title" data-dialog-initial tabIndex={-1}>{override ? "Editar excepción" : "Agregar excepción"}</h2></div><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    <div className="workforce-form__body">
      <p className="workforce-form__help">Esta excepción reemplaza el horario habitual únicamente para esta fecha.</p>
      <label><span>Fecha</span><input required type="date" value={date} disabled={saving} aria-invalid={Boolean(fieldError("date")) || Boolean(duplicate)} aria-describedby={fieldError("date") || duplicate ? "override-date-error" : undefined} onChange={(event) => setDate(event.target.value)} />{fieldError("date") || duplicate ? <small id="override-date-error" className="field-error">{fieldError("date") ?? "Ya existe una excepción para este empleado y fecha."}</small> : null}{duplicate ? <button className="workforce-form__inline-action" type="button" onClick={() => onEditExisting(duplicate)}>Editar excepción existente</button> : null}</label>
      <fieldset><legend>Tipo</legend><div className="workforce-form__options"><label><input type="radio" checked={type === "working"} disabled={saving} onChange={() => changeType("working")} /><span>Horario excepcional</span></label><label><input type="radio" checked={type === "non_working"} disabled={saving} onChange={() => changeType("non_working")} /><span>No laborable</span></label></div></fieldset>
      {type === "working" ? <div className="workforce-form__grid"><label><span>Inicio</span><input required type="time" value={startsAt} disabled={saving} aria-invalid={Boolean(fieldError("starts_at"))} aria-describedby={fieldError("starts_at") ? "override-start-error" : undefined} onChange={(event) => setStartsAt(event.target.value)} />{fieldError("starts_at") ? <small id="override-start-error" className="field-error">{fieldError("starts_at")}</small> : null}</label><label><span>Fin</span><input required type="time" value={endsAt} disabled={saving} aria-invalid={Boolean(fieldError("ends_at"))} aria-describedby={fieldError("ends_at") ? "override-end-error" : undefined} onChange={(event) => setEndsAt(event.target.value)} />{fieldError("ends_at") ? <small id="override-end-error" className="field-error">{fieldError("ends_at")}</small> : null}</label></div> : <p className="workforce-form__help">El empleado quedará como no laborable durante todo el día.</p>}
      <label><span>Motivo</span><textarea maxLength={255} value={reason} disabled={saving} aria-invalid={Boolean(fieldError("reason"))} aria-describedby={fieldError("reason") ? "override-reason-error" : undefined} onChange={(event) => setReason(event.target.value)} />{fieldError("reason") ? <small id="override-reason-error" className="field-error">{fieldError("reason")}</small> : <small>Opcional.</small>}</label>
      {error ? <p className="workforce-form__error" role="alert">{error}</p> : null}
    </div><footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving || Boolean(duplicate)}>{saving ? "Guardando..." : "Guardar excepción"}</button></footer>
  </form></CrmDialog>;
};
