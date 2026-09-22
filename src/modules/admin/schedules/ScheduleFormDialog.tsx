import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { ApiError } from "../../../api/http";
import { createEmployeeSchedule, updateEmployeeSchedule } from "../../../api/employeeSchedules";
import { CrmDialog } from "../../../components/crm/Dialog";
import type { EmployeeWorkSchedule } from "../../../types/workforce";
import { isTimeRangeValid, normalizeDateOnly, normalizeTimeOnly, timestampToBogotaDateTimeLocal } from "../../../utils/crmDateTime";
import { scheduleDays } from "./scheduleUtils";

const today = () => timestampToBogotaDateTimeLocal(new Date().toISOString())?.slice(0, 10) ?? "";

export const ScheduleFormDialog = ({ employeeId, schedule, defaultDay, onClose, onSaved }: { employeeId: number; schedule: EmployeeWorkSchedule | null; defaultDay?: number; onClose: () => void; onSaved: (message: string) => void }) => {
  const [day, setDay] = useState(schedule?.day_of_week ?? defaultDay ?? 1);
  const [startsAt, setStartsAt] = useState(normalizeTimeOnly(schedule?.starts_at) ?? "08:00");
  const [endsAt, setEndsAt] = useState(normalizeTimeOnly(schedule?.ends_at) ?? "17:00");
  const [effectiveFrom, setEffectiveFrom] = useState(normalizeDateOnly(schedule?.effective_from) ?? today());
  const [effectiveUntil, setEffectiveUntil] = useState(normalizeDateOnly(schedule?.effective_until) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setErrors({});
    if (!isTimeRangeValid(startsAt, endsAt)) { setErrors({ ends_at: ["La hora de fin debe ser posterior a la hora de inicio."] }); return; }
    if (!effectiveFrom) { setErrors({ effective_from: ["La fecha de inicio de vigencia es obligatoria."] }); return; }
    if (effectiveUntil && effectiveUntil < effectiveFrom) { setErrors({ effective_until: ["La fecha final debe ser igual o posterior a la fecha inicial."] }); return; }
    setSaving(true);
    try {
      const payload = { day_of_week: day, starts_at: startsAt, ends_at: endsAt, effective_from: effectiveFrom, effective_until: effectiveUntil || null };
      if (schedule) await updateEmployeeSchedule(schedule.id, payload);
      else await createEmployeeSchedule({ employee_id: employeeId, ...payload });
      onSaved(schedule ? "Intervalo actualizado correctamente." : "Intervalo agregado correctamente.");
    } catch (cause) {
      if (cause instanceof ApiError) setErrors(cause.errors);
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el intervalo.");
    } finally { setSaving(false); }
  };
  const fieldError = (field: string) => errors[field]?.[0];

  return <CrmDialog open titleId="schedule-form-title" onClose={onClose} busy={saving} className="workforce-dialog"><form className="workforce-form" onSubmit={submit} noValidate>
    <header><div><span>Horario habitual</span><h2 id="schedule-form-title" data-dialog-initial tabIndex={-1}>{schedule ? "Editar intervalo" : "Agregar intervalo"}</h2></div><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    <div className="workforce-form__body">
      <label><span>Día</span><select value={day} disabled={saving} aria-invalid={Boolean(fieldError("day_of_week"))} aria-describedby={fieldError("day_of_week") ? "schedule-day-error" : undefined} onChange={(event) => setDay(Number(event.target.value))}>{scheduleDays.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{fieldError("day_of_week") ? <small id="schedule-day-error" className="field-error">{fieldError("day_of_week")}</small> : null}</label>
      <div className="workforce-form__grid"><label><span>Hora inicio</span><input required type="time" value={startsAt} disabled={saving} aria-invalid={Boolean(fieldError("starts_at"))} aria-describedby={fieldError("starts_at") ? "schedule-start-error" : undefined} onChange={(event) => setStartsAt(event.target.value)} />{fieldError("starts_at") ? <small id="schedule-start-error" className="field-error">{fieldError("starts_at")}</small> : null}</label><label><span>Hora fin</span><input required type="time" value={endsAt} disabled={saving} aria-invalid={Boolean(fieldError("ends_at"))} aria-describedby={fieldError("ends_at") ? "schedule-end-error" : undefined} onChange={(event) => setEndsAt(event.target.value)} />{fieldError("ends_at") ? <small id="schedule-end-error" className="field-error">{fieldError("ends_at")}</small> : null}</label></div>
      <div className="workforce-form__grid"><label><span>Vigente desde</span><input required type="date" value={effectiveFrom} disabled={saving} aria-invalid={Boolean(fieldError("effective_from"))} aria-describedby={fieldError("effective_from") ? "schedule-effective-from-error" : undefined} onChange={(event) => setEffectiveFrom(event.target.value)} />{fieldError("effective_from") ? <small id="schedule-effective-from-error" className="field-error">{fieldError("effective_from")}</small> : null}</label><label><span>Vigente hasta</span><input type="date" min={effectiveFrom} value={effectiveUntil} disabled={saving} aria-invalid={Boolean(fieldError("effective_until"))} aria-describedby={fieldError("effective_until") ? "schedule-effective-until-error" : undefined} onChange={(event) => setEffectiveUntil(event.target.value)} />{fieldError("effective_until") ? <small id="schedule-effective-until-error" className="field-error">{fieldError("effective_until")}</small> : <small>Opcional: sin fecha de finalización.</small>}</label></div>
      {error ? <p className="workforce-form__error" role="alert">{error}</p> : null}
    </div><footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar intervalo"}</button></footer>
  </form></CrmDialog>;
};
