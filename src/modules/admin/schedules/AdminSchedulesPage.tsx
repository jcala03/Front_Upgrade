import { CalendarClock, CalendarOff, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { deleteEmployeeSchedule, deleteEmployeeScheduleOverride, getEmployeeScheduleOverrides, getEmployeeSchedules } from "../../../api/employeeSchedules";
import { CrmDialog } from "../../../components/crm/Dialog";
import { EmployeeSelector } from "../../../components/crm/EmployeeSelector";
import { StatusBadge } from "../../../components/crm/StatusBadge";
import type { Employee } from "../../../types/employee";
import type { EmployeeScheduleOverride, EmployeeWorkSchedule, WorkforcePaginator } from "../../../types/workforce";
import { hasPermission } from "../../../utils/authStorage";
import { formatDateOnly, formatTimeOnly, timestampToBogotaDateTimeLocal } from "../../../utils/crmDateTime";
import { OverrideFormDialog } from "./OverrideFormDialog";
import { ScheduleFormDialog } from "./ScheduleFormDialog";
import { scheduleDays } from "./scheduleUtils";
import "./AdminSchedulesPage.css";

type DeleteTarget = { kind: "schedule"; item: EmployeeWorkSchedule } | { kind: "override"; item: EmployeeScheduleOverride };
const initialEmployeeId = () => { const raw = new URLSearchParams(window.location.search).get("employee_id"); const id = Number(raw); return Number.isInteger(id) && id > 0 ? id : null; };
const collectPages = async <T,>(loader: (page: number) => Promise<WorkforcePaginator<T>>) => {
  const first = await loader(1);
  const rows = [...first.data];
  for (let page = 2; page <= first.last_page; page += 1) rows.push(...(await loader(page)).data);
  return rows;
};

export const AdminSchedulesPage = () => {
  const canUpdate = hasPermission("employee_schedules.update");
  const [employeeId, setEmployeeId] = useState<number | null>(initialEmployeeId);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [schedules, setSchedules] = useState<EmployeeWorkSchedule[]>([]);
  const [overrides, setOverrides] = useState<EmployeeScheduleOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleForm, setScheduleForm] = useState<{ schedule: EmployeeWorkSchedule | null; day?: number } | null>(null);
  const [overrideForm, setOverrideForm] = useState<EmployeeScheduleOverride | "new" | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [mutating, setMutating] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const reloadKey = useRef(0);
  const todayDate = timestampToBogotaDateTimeLocal(new Date().toISOString())?.slice(0, 10) ?? "";

  useEffect(() => {
    if (!employeeId) { setSchedules([]); setOverrides([]); setLoading(false); return; }
    const controller = new AbortController(); const request = ++reloadKey.current;
    setLoading(true); setError(""); setSchedules([]); setOverrides([]);
    Promise.all([
      collectPages((page) => getEmployeeSchedules({ employee_id: employeeId, page, per_page: 100 }, controller.signal)),
      collectPages((page) => getEmployeeScheduleOverrides({ employee_id: employeeId, page, per_page: 100 }, controller.signal)),
    ]).then(([scheduleRows, overrideRows]) => { if (request === reloadKey.current) { setSchedules(scheduleRows); setOverrides(overrideRows); } })
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError") && request === reloadKey.current) setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración horaria."); })
      .finally(() => { if (request === reloadKey.current) setLoading(false); });
    return () => { controller.abort(); reloadKey.current += 1; };
  }, [employeeId, refreshVersion]);

  const selectEmployee = (next: Employee | null) => {
    setEmployee(next); setEmployeeId(next?.id ?? null); setSchedules([]); setOverrides([]); setMessage(""); setError("");
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("employee_id", String(next.id)); else url.searchParams.delete("employee_id");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setMutating(true); setError("");
    try {
      if (deleting.kind === "schedule") { await deleteEmployeeSchedule(deleting.item.id); setSchedules((current) => current.filter((item) => item.id !== deleting.item.id)); setMessage("Intervalo eliminado correctamente."); }
      else { await deleteEmployeeScheduleOverride(deleting.item.id); setOverrides((current) => current.filter((item) => item.id !== deleting.item.id)); setMessage("Excepción eliminada correctamente."); }
      setDeleting(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar la configuración."); }
    finally { setMutating(false); }
  };
  const saved = (feedback: string) => { setMessage(feedback); setScheduleForm(null); setOverrideForm(null); setRefreshVersion((current) => current + 1); };

  return <section className="admin-schedules" aria-labelledby="schedules-heading">
    <header className="workforce-page-header"><div><span>Personal</span><h2 id="schedules-heading">Horarios</h2><p>Configura la jornada habitual y las excepciones de cada empleado.</p></div></header>
    <div className="workforce-filter-card"><EmployeeSelector value={employeeId} onChange={selectEmployee} onResolved={setEmployee} /><div className="workforce-filter-card__state">{employee ? <><strong>{employee.name}</strong><StatusBadge label={employee.is_active ? "Activo" : "Inactivo"} tone={employee.is_active ? "success" : "neutral"} /></> : employeeId ? <span>Cargando empleado seleccionado...</span> : <span>Selecciona un empleado para consultar su configuración.</span>}</div></div>
    {message ? <p className="workforce-feedback" role="status">{message}</p> : null}
    {error ? <div className="workforce-feedback is-error" role="alert"><span>{error}</span>{employeeId ? <button type="button" onClick={() => setRefreshVersion((current) => current + 1)}>Reintentar</button> : null}</div> : null}
    {!employeeId ? <div className="workforce-state"><CalendarClock size={26} aria-hidden="true" /><strong>Selecciona un empleado</strong><p>Su horario semanal y sus excepciones aparecerán aquí.</p></div> : <>
      <section className="schedule-section" aria-labelledby="weekly-schedule-title"><header><div><span>Jornada recurrente</span><h3 id="weekly-schedule-title">Horario semanal</h3></div>{canUpdate ? <button className="is-primary" type="button" onClick={() => setScheduleForm({ schedule: null })}><Plus size={17} aria-hidden="true" />Agregar intervalo</button> : null}</header>
        {loading && !schedules.length ? <p className="workforce-state" role="status">Cargando horario...</p> : <div className="schedule-week">{scheduleDays.map((day) => { const rows = schedules.filter((item) => item.day_of_week === day.value).sort((a, b) => a.starts_at.localeCompare(b.starts_at)); return <section className="schedule-day" key={day.value} aria-labelledby={`schedule-day-${day.value}`}><header><h4 id={`schedule-day-${day.value}`}>{day.label}</h4>{canUpdate ? <button type="button" onClick={() => setScheduleForm({ schedule: null, day: day.value })}><Plus size={16} aria-hidden="true" />Intervalo</button> : null}</header>{rows.length ? <ul>{rows.map((item) => <li key={item.id}><div><strong>{formatTimeOnly(item.starts_at)} – {formatTimeOnly(item.ends_at)}</strong><span>Desde {formatDateOnly(item.effective_from)} · {item.effective_until ? `hasta ${formatDateOnly(item.effective_until)}` : "sin fecha de finalización"}</span></div>{canUpdate ? <div><button type="button" onClick={() => setScheduleForm({ schedule: item })}>Editar</button><button className="is-danger" type="button" onClick={() => setDeleting({ kind: "schedule", item })}><Trash2 size={15} aria-hidden="true" />Eliminar</button></div> : null}</li>)}</ul> : <p>No tiene intervalos configurados para este día.</p>}</section>; })}</div>}
        {!loading && !schedules.length ? <div className="schedule-empty"><p>No tiene horario configurado.</p>{canUpdate ? <button type="button" onClick={() => setScheduleForm({ schedule: null, day: 1 })}>Agregar primer intervalo</button> : null}</div> : null}
      </section>
      <section className="schedule-section" aria-labelledby="schedule-overrides-title"><header><div><span>Fechas concretas</span><h3 id="schedule-overrides-title">Excepciones</h3><p>Una excepción reemplaza el horario habitual únicamente para su fecha.</p></div>{canUpdate ? <button className="is-primary" type="button" onClick={() => setOverrideForm("new")}><Plus size={17} aria-hidden="true" />Agregar excepción</button> : null}</header>
        {loading && !overrides.length ? <p className="workforce-state" role="status">Cargando excepciones...</p> : overrides.length ? <ul className="schedule-overrides">{[...overrides].sort((a, b) => { const aPast = a.date < todayDate; const bPast = b.date < todayDate; if (aPast !== bPast) return aPast ? 1 : -1; return aPast ? b.date.localeCompare(a.date) || b.id - a.id : a.date.localeCompare(b.date) || a.id - b.id; }).map((item) => { const isPast = item.date < todayDate; return <li key={item.id} className={isPast ? "is-past" : undefined}><div className="schedule-overrides__icon">{item.type === "working" ? <CalendarClock size={19} aria-hidden="true" /> : <CalendarOff size={19} aria-hidden="true" />}</div><div><strong>{formatDateOnly(item.date)}</strong><StatusBadge label={item.type === "working" ? "Horario excepcional" : "No laborable"} tone={item.type === "working" ? "info" : "warning"} /><StatusBadge label={isPast ? "Pasada" : "Próxima"} tone={isPast ? "neutral" : "success"} /><span>{item.type === "working" ? `${formatTimeOnly(item.starts_at)} – ${formatTimeOnly(item.ends_at)}` : "Día completo"}{item.reason ? ` · ${item.reason}` : ""}</span></div>{canUpdate ? <div className="schedule-overrides__actions"><button type="button" onClick={() => setOverrideForm(item)}>Editar</button><button className="is-danger" type="button" onClick={() => setDeleting({ kind: "override", item })}>Eliminar</button></div> : null}</li>; })}</ul> : <p className="schedule-empty">No hay excepciones registradas para este empleado.</p>}
      </section>
    </>}
    {employeeId && scheduleForm ? <ScheduleFormDialog employeeId={employeeId} schedule={scheduleForm.schedule} defaultDay={scheduleForm.day} onClose={() => setScheduleForm(null)} onSaved={saved} /> : null}
    {employeeId && overrideForm ? <OverrideFormDialog key={overrideForm === "new" ? "new" : overrideForm.id} employeeId={employeeId} override={overrideForm === "new" ? null : overrideForm} existing={overrides} onClose={() => setOverrideForm(null)} onSaved={saved} onEditExisting={(item) => setOverrideForm(item)} /> : null}
    <CrmDialog open={Boolean(deleting)} titleId="schedule-delete-title" onClose={() => setDeleting(null)} busy={mutating} className="workforce-confirm"><article><header><div><span>Confirmación</span><h2 id="schedule-delete-title" data-dialog-initial tabIndex={-1}>{deleting?.kind === "schedule" ? "Eliminar intervalo" : "Eliminar excepción"}</h2></div><button type="button" aria-label="Cerrar" disabled={mutating} onClick={() => setDeleting(null)}><X size={20} aria-hidden="true" /></button></header><p>{deleting?.kind === "schedule" ? "Este intervalo dejará de formar parte del horario habitual." : "Esta fecha volverá a regirse por el horario habitual aplicable."}</p><footer><button type="button" disabled={mutating} onClick={() => setDeleting(null)}>Volver</button><button className="is-danger" type="button" disabled={mutating} onClick={() => void confirmDelete()}>{mutating ? "Eliminando..." : "Eliminar"}</button></footer></article></CrmDialog>
  </section>;
};
