import {
  CalendarClock,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  cancelAppointment,
  changeAppointmentStatus,
  createAppointment,
  getAppointment,
  getAppointments,
  rescheduleAppointment,
  updateAppointment,
} from "../../../api/appointments";
import { listAllBranches } from "../../../api/branches";
import { getCustomers, getCustomerVehicles } from "../../../api/customers";
import { getEmployeeAvailability } from "../../../api/employeeSchedules";
import { ApiError } from "../../../api/http";
import { getServices } from "../../../api/services";
import { CrmDialog } from "../../../components/crm/Dialog";
import { EmployeeSelector } from "../../../components/crm/EmployeeSelector";
import { StatusBadge } from "../../../components/crm/StatusBadge";
import type {
  AdminAppointment,
  AppointmentFilters,
  AppointmentPaginator,
  AppointmentStatus,
  CreateAppointmentPayload,
  RescheduleAppointmentPayload,
  UpdateAppointmentPayload,
} from "../../../types/appointment";
import type { Branch } from "../../../types/branch";
import type { Customer, CustomerVehicle } from "../../../types/customer";
import type { Employee } from "../../../types/employee";
import type { Service } from "../../../types/service";
import type { AvailabilityReasonCode } from "../../../types/workforce";
import { hasPermission } from "../../../utils/authStorage";
import {
  bogotaDateTimeLocalToTimestamp,
  formatCrmTimestamp,
  isDateTimeRangeValid,
  isSameLocalDateTimeDay,
  timestampToBogotaDateTimeLocal,
} from "../../../utils/crmDateTime";
import { appointmentSourceLabel, appointmentStatusLabel, availabilityReasonLabel } from "../../../utils/crmPresentation";
import "./AdminAppointmentsPage.css";

type DialogMode = "create" | "edit" | "reschedule";
type FormAppointment = AdminAppointment | null;
type AppointmentAction = "confirm" | "start" | "complete" | "no_show";
type ActiveAction = { id: number; action: AppointmentAction } | null;

const statuses: AppointmentStatus[] = ["requested", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
const emptyResult: AppointmentPaginator = { current_page: 1, data: [], last_page: 1, per_page: 25, total: 0, from: null, to: null };
const terminalStatuses: AppointmentStatus[] = ["completed", "cancelled", "no_show"];
const reasonCodes: AvailabilityReasonCode[] = ["inactive_employee", "outside_work_schedule", "no_work_schedule", "approved_leave", "task_overlap", "appointment_overlap"];

const timestampFromLocal = (value: string) => value ? bogotaDateTimeLocalToTimestamp(value) ?? undefined : undefined;
const branchLabel = (appointment: AdminAppointment) => appointment.branch ? `${appointment.branch.name} · ${appointment.branch.code}` : "Sin sede histórica";
const employeeLabel = (appointment: AdminAppointment) => appointment.responsible_employee?.name ?? (appointment.responsible_employee_id ? `Empleado #${appointment.responsible_employee_id}` : "Sin responsable");
const serviceLabel = (appointment: AdminAppointment) => appointment.service_name ?? appointment.service?.name ?? "Sin servicio";
const customerLabel = (appointment: AdminAppointment) => appointment.customer?.name ?? appointment.contact_name;
const vehicleLabel = (vehicle: CustomerVehicle) => [vehicle.nickname, vehicle.vehicle_brand?.name ?? vehicle.vehicleBrand?.name, vehicle.vehicle_model?.name ?? vehicle.vehicleModel?.name, vehicle.vehicle_version?.display_name ?? vehicle.vehicleVersion?.display_name, vehicle.year, vehicle.plate].filter(Boolean).join(" · ") || `Vehículo #${vehicle.id}`;
const statusTone = (status: AppointmentStatus) => status === "completed" ? "success" : status === "cancelled" || status === "no_show" ? "danger" : status === "in_progress" ? "warning" : "neutral";
const localRangesOverlap = (startsA: string, endsA: string, startsB: string, endsB: string) => Boolean(startsA && endsA && startsB && endsB && startsA < endsB && endsA > startsB);

const allowedActions = (appointment: AdminAppointment): AppointmentAction[] => {
  if (appointment.status === "requested") return ["confirm"];
  if (appointment.status === "confirmed") return ["start", "complete", "no_show"];
  if (appointment.status === "in_progress") return ["complete"];
  return [];
};

const actionLabel = (action: AppointmentAction) => ({
  confirm: "Confirmar",
  start: "Iniciar",
  complete: "Completar",
  no_show: "No asistió",
})[action];

const actionStatus = (action: AppointmentAction): AppointmentStatus => ({
  confirm: "confirmed",
  start: "in_progress",
  complete: "completed",
  no_show: "no_show",
} satisfies Record<AppointmentAction, AppointmentStatus>)[action];

export const AdminAppointmentsPage = () => {
  const canCreate = hasPermission("appointments.create");
  const canUpdate = hasPermission("appointments.update");
  const canCancel = hasPermission("appointments.cancel");
  const canCheckAvailability = hasPermission("employee_availability.view");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesError, setBranchesError] = useState("");
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AppointmentPaginator>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminAppointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailActionError, setDetailActionError] = useState("");
  const [form, setForm] = useState<{ mode: DialogMode; appointment: FormAppointment } | null>(null);
  const [cancelling, setCancelling] = useState<AdminAppointment | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const actionInFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setBranchesLoading(true);
    setBranchesError("");
    void listAllBranches(controller.signal)
      .then(setBranches)
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setBranchesError(cause instanceof Error ? cause.message : "No se pudieron cargar las sedes.");
        }
      })
      .finally(() => setBranchesLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++listRequest.current;
    setLoading(true);
    setError("");
    const filters: AppointmentFilters = {
      branch_id: branchId ?? undefined,
      responsible_employee_id: employeeId ?? undefined,
      search: search || undefined,
      status: status || undefined,
      from: timestampFromLocal(from),
      to: timestampFromLocal(to),
      page,
      per_page: 25,
    };

    void getAppointments(filters, controller.signal)
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
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar las citas.");
        }
      })
      .finally(() => {
        if (request === listRequest.current) setLoading(false);
      });

    return () => {
      controller.abort();
      listRequest.current += 1;
    };
  }, [branchId, employeeId, from, page, refreshVersion, search, status, to]);

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
    void getAppointment(detailId, controller.signal)
      .then((appointment) => {
        if (request === detailRequest.current) setDetail(appointment);
      })
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError") && request === detailRequest.current) {
          setDetailError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle de la cita.");
        }
      })
      .finally(() => {
        if (request === detailRequest.current) setDetailLoading(false);
      });
    return () => {
      controller.abort();
      detailRequest.current += 1;
    };
  }, [detailId]);

  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(draftSearch.trim());
    setPage(1);
    setMessage("");
  };

  const refresh = () => setRefreshVersion((current) => current + 1);

  const selectEmployee = (employee: Employee | null) => {
    setEmployeeId(employee?.id ?? null);
    setPage(1);
    setMessage("");
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

  const openDetail = (appointmentId: number) => {
    setMessage("");
    setError("");
    setDetailActionError("");
    setDetailId(appointmentId);
  };

  const saved = (feedback: string, appointment?: AdminAppointment) => {
    setForm(null);
    setMessage(feedback);
    setError("");
    setDetail((current) => appointment && current?.id === appointment.id ? appointment : current);
    refresh();
  };

  const runAction = async (appointment: AdminAppointment, action: AppointmentAction) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActiveAction({ id: appointment.id, action });
    setError("");
    setDetailActionError("");
    setMessage("");
    try {
      const updated = await changeAppointmentStatus(appointment.id, actionStatus(action));
      if (!mounted.current) return;
      setResult((current) => ({ ...current, data: current.data.map((row) => row.id === updated.id ? updated : row) }));
      setDetail((current) => current?.id === updated.id ? updated : current);
      setMessage(`Cita ${appointmentStatusLabel(updated.status).toLowerCase()} correctamente.`);
      refresh();
    } catch (cause) {
      const actionError = cause instanceof Error ? cause.message : "No se pudo actualizar el estado de la cita.";
      if (mounted.current) {
        setError(actionError);
        if (detailId === appointment.id) setDetailActionError(actionError);
      }
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setActiveAction(null);
    }
  };

  const openEdit = (appointment: AdminAppointment) => {
    closeDetail();
    setForm({ mode: "edit", appointment });
    setMessage("");
  };

  const openReschedule = (appointment: AdminAppointment) => {
    closeDetail();
    setForm({ mode: "reschedule", appointment });
    setMessage("");
  };

  const openCancel = (appointment: AdminAppointment) => {
    closeDetail();
    setCancelling(appointment);
    setMessage("");
  };

  const cancelled = (appointment: AdminAppointment) => {
    setCancelling(null);
    setMessage("Cita cancelada correctamente.");
    setResult((current) => ({ ...current, data: current.data.map((row) => row.id === appointment.id ? appointment : row) }));
    refresh();
  };

  const hasRows = result.data.length > 0;
  const activeDetailAction = activeAction?.id === detailId ? activeAction.action : null;

  return <section className="admin-appointments" aria-labelledby="admin-appointments-heading">
    <header className="admin-appointments__header">
      <div><span>Operación</span><h2 id="admin-appointments-heading">Citas</h2><p>Programa citas con responsable operativo y sede histórica congelada.</p></div>
      {canCreate ? <button className="is-primary" type="button" onClick={() => { setForm({ mode: "create", appointment: null }); setMessage(""); }}><Plus size={18} aria-hidden="true" />Nueva cita</button> : null}
    </header>

    <form className="admin-appointments__filters" onSubmit={applySearch}>
      <label className="admin-appointments__search"><span>Buscar</span><div><Search size={16} aria-hidden="true" /><input type="search" maxLength={180} value={draftSearch} placeholder="Título, contacto, vehículo o servicio" onChange={(event) => setDraftSearch(event.target.value)} /></div></label>
      <label><span>Sede histórica</span><select value={branchId ?? ""} disabled={branchesLoading} onChange={(event) => { setBranchId(event.target.value ? Number(event.target.value) : null); setPage(1); setMessage(""); }}><option value="">Todas las sedes</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.code}{branch.is_active ? "" : " · Inactiva"}</option>)}</select>{branchesError ? <small className="appointment-field-error" role="alert">{branchesError}</small> : null}</label>
      <EmployeeSelector value={employeeId} onChange={selectEmployee} allowAll label="Responsable" />
      <label><span>Estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as AppointmentStatus | ""); setPage(1); setMessage(""); }}><option value="">Todos</option>{statuses.map((value) => <option key={value} value={value}>{appointmentStatusLabel(value)}</option>)}</select></label>
      <label><span>Desde · Colombia</span><input type="datetime-local" value={from} max={to || undefined} onChange={(event) => { const next = event.target.value; setFrom(next); if (to && next && next > to) setTo(""); setPage(1); }} /></label>
      <label><span>Hasta · Colombia</span><input type="datetime-local" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
      <button type="submit" disabled={loading}><Search size={16} aria-hidden="true" />Aplicar</button>
    </form>

    {message && detailId === null ? <p className="admin-appointments__feedback" role="status">{message}</p> : null}
    {error && detailId === null ? <div className="admin-appointments__feedback is-error" role="alert"><span>{error}</span><button type="button" onClick={refresh}><RefreshCcw size={15} aria-hidden="true" />Reintentar</button></div> : null}
    {loading && hasRows ? <span className="sr-only" role="status">Actualizando citas...</span> : null}

    {loading && !hasRows ? <div className="admin-appointments__state" role="status">Cargando citas...</div>
      : error && !hasRows ? null
        : !loading && !hasRows ? <div className="admin-appointments__state"><CalendarClock size={30} aria-hidden="true" /><strong>Aún no hay citas</strong><p>Cuando programes la primera cita aparecerá aquí con su sede histórica.</p>{canCreate ? <button type="button" onClick={() => setForm({ mode: "create", appointment: null })}>Nueva cita</button> : null}</div>
          : <>
            <div className={`admin-appointments__content ${loading ? "is-updating" : ""}`}>
              <div className="admin-appointments__table-wrap"><table><thead><tr><th>Cita</th><th>Contacto</th><th>Responsable</th><th>Sede snapshot</th><th>Servicio</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{result.data.map((appointment) => <tr key={appointment.id}><td><strong>{appointment.title}</strong><small>{formatCrmTimestamp(appointment.starts_at)} - {formatCrmTimestamp(appointment.ends_at, { timeStyle: "short" })}</small></td><td>{customerLabel(appointment)}<small>{appointment.vehicle_description ?? "Sin vehículo"}</small></td><td>{employeeLabel(appointment)}</td><td>{branchLabel(appointment)}</td><td>{serviceLabel(appointment)}</td><td><StatusBadge label={appointmentStatusLabel(appointment.status)} tone={statusTone(appointment.status)} /></td><td><AppointmentActions appointment={appointment} canUpdate={canUpdate} canCancel={canCancel} busy={loading || Boolean(activeAction)} activeAction={activeAction?.id === appointment.id ? activeAction.action : null} onDetail={() => openDetail(appointment.id)} onEdit={() => openEdit(appointment)} onReschedule={() => openReschedule(appointment)} onAction={(action) => void runAction(appointment, action)} onCancel={() => openCancel(appointment)} /></td></tr>)}</tbody></table></div>
              <div className="admin-appointments__cards">{result.data.map((appointment) => <article key={appointment.id}><header><div><span>{formatCrmTimestamp(appointment.starts_at)}</span><h3>{appointment.title}</h3></div><StatusBadge label={appointmentStatusLabel(appointment.status)} tone={statusTone(appointment.status)} /></header><dl><div><dt>Contacto</dt><dd>{customerLabel(appointment)}</dd></div><div><dt>Responsable</dt><dd>{employeeLabel(appointment)}</dd></div><div><dt>Sede snapshot</dt><dd>{branchLabel(appointment)}</dd></div><div><dt>Servicio</dt><dd>{serviceLabel(appointment)}</dd></div></dl><AppointmentActions appointment={appointment} canUpdate={canUpdate} canCancel={canCancel} busy={loading || Boolean(activeAction)} activeAction={activeAction?.id === appointment.id ? activeAction.action : null} onDetail={() => openDetail(appointment.id)} onEdit={() => openEdit(appointment)} onReschedule={() => openReschedule(appointment)} onAction={(action) => void runAction(appointment, action)} onCancel={() => openCancel(appointment)} /></article>)}</div>
            </div>
            {result.last_page > 1 ? <nav className="admin-appointments__pagination" aria-label="Paginación de citas"><button type="button" disabled={loading || result.current_page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</button><span>Página {result.current_page} de {result.last_page}</span><button type="button" disabled={loading || result.current_page >= result.last_page} onClick={() => setPage((current) => current + 1)}>Siguiente</button></nav> : null}
          </>}

    {form ? <AppointmentFormDialog mode={form.mode} appointment={form.appointment} canCheckAvailability={canCheckAvailability} onClose={() => setForm(null)} onSaved={saved} /> : null}
    <AppointmentDetailDialog appointmentId={detailId} appointment={detail} loading={detailLoading} error={detailError} actionError={detailActionError} feedback={detailId !== null ? message : ""} busyAction={activeDetailAction} canUpdate={canUpdate} canCancel={canCancel} onClose={closeDetail} onRetry={() => detailId && openDetail(detailId)} onEdit={openEdit} onReschedule={openReschedule} onAction={(appointment, action) => void runAction(appointment, action)} onCancel={openCancel} />
    {cancelling ? <AppointmentCancelDialog appointment={cancelling} onClose={() => setCancelling(null)} onCancelled={cancelled} /> : null}
  </section>;
};

const AppointmentActions = ({ appointment, canUpdate, canCancel, busy, activeAction, onDetail, onEdit, onReschedule, onAction, onCancel }: {
  appointment: AdminAppointment;
  canUpdate: boolean;
  canCancel: boolean;
  busy: boolean;
  activeAction: AppointmentAction | null;
  onDetail: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onAction: (action: AppointmentAction) => void;
  onCancel: () => void;
}) => {
  const terminal = terminalStatuses.includes(appointment.status);
  const actions = allowedActions(appointment);
  return <div className="appointment-actions">
    <button type="button" disabled={busy} onClick={onDetail}><Eye size={15} aria-hidden="true" />Ver</button>
    {!terminal && canUpdate ? <button type="button" disabled={busy} onClick={onEdit}><Pencil size={15} aria-hidden="true" />Editar</button> : null}
    {(appointment.status === "requested" || appointment.status === "confirmed") && canUpdate ? <button type="button" disabled={busy} onClick={onReschedule}><CalendarClock size={15} aria-hidden="true" />Reprogramar</button> : null}
    {canUpdate ? actions.map((action) => <button key={action} className={action === "complete" ? "is-success" : undefined} type="button" disabled={busy} aria-busy={activeAction === action} onClick={() => onAction(action)}>{action === "no_show" ? <UserX size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}{activeAction === action ? "Procesando..." : actionLabel(action)}</button>) : null}
    {!terminal && canCancel ? <button className="is-danger" type="button" disabled={busy} onClick={onCancel}><XCircle size={15} aria-hidden="true" />Cancelar</button> : null}
  </div>;
};

const AppointmentFormDialog = ({ mode, appointment, canCheckAvailability, onClose, onSaved }: {
  mode: DialogMode;
  appointment: FormAppointment;
  canCheckAvailability: boolean;
  onClose: () => void;
  onSaved: (message: string, appointment?: AdminAppointment) => void;
}) => {
  const isCreate = mode === "create";
  const isReschedule = mode === "reschedule";
  const [employeeId, setEmployeeId] = useState<number | null>(appointment?.responsible_employee_id ?? null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(appointment?.customer_id ?? null);
  const [vehicleId, setVehicleId] = useState<number | null>(appointment?.customer_vehicle_id ?? null);
  const [serviceId, setServiceId] = useState<number | null>(appointment?.service_id ?? null);
  const [status, setStatus] = useState<"requested" | "confirmed">(appointment?.status === "requested" ? "requested" : "confirmed");
  const [title, setTitle] = useState(appointment?.title ?? "");
  const [description, setDescription] = useState(appointment?.description ?? "");
  const [contactName, setContactName] = useState(appointment?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(appointment?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(appointment?.contact_email ?? "");
  const [vehicleDescription, setVehicleDescription] = useState(appointment?.vehicle_description ?? "");
  const [startsAt, setStartsAt] = useState(timestampToBogotaDateTimeLocal(appointment?.starts_at) ?? "");
  const [endsAt, setEndsAt] = useState(timestampToBogotaDateTimeLocal(appointment?.ends_at) ?? "");
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [availability, setAvailability] = useState<AvailabilityState>({ status: "idle" });
  const availabilityRequest = useRef(0);
  const appointmentNeedsAvailability = appointment?.status === "confirmed" || appointment?.status === "in_progress";
  const availabilityRelevant = Boolean(employeeId && startsAt && endsAt && (isCreate ? status === "confirmed" : isReschedule || appointmentNeedsAvailability));
  const validRange = isDateTimeRangeValid(startsAt, endsAt) && isSameLocalDateTimeDay(startsAt, endsAt);
  const originalStartsAt = timestampToBogotaDateTimeLocal(appointment?.starts_at) ?? "";
  const originalEndsAt = timestampToBogotaDateTimeLocal(appointment?.ends_at) ?? "";
  const sameCurrentEmployee = Boolean(appointment && employeeId === appointment.responsible_employee_id);
  const rescheduleMaySelfOverlap = isReschedule && sameCurrentEmployee && localRangesOverlap(startsAt, endsAt, originalStartsAt, originalEndsAt);
  const shouldPrecheckAvailability = Boolean(availabilityRelevant && (isCreate || (!isReschedule && appointmentNeedsAvailability && !sameCurrentEmployee) || (isReschedule && !rescheduleMaySelfOverlap)));

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);
    Promise.allSettled([
      getCustomers({ per_page: 100 }),
      getServices({ per_page: 100, is_active: true }),
    ]).then(([customerResult, serviceResult]) => {
      if (!active) return;
      if (customerResult.status === "fulfilled") setCustomers(customerResult.value.data);
      if (serviceResult.status === "fulfilled") setServices(serviceResult.value.data);
    }).finally(() => {
      if (active) setLoadingOptions(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setVehicles([]);
    if (!customerId) {
      setVehicleId(null);
      return () => { active = false; };
    }
    void getCustomerVehicles(customerId)
      .then((rows) => {
        if (!active) return;
        setVehicles(rows);
        if (vehicleId && !rows.some((vehicle) => vehicle.id === vehicleId)) setVehicleId(null);
      })
      .catch(() => {
        if (active) setVehicles([]);
      });
    return () => { active = false; };
  }, [customerId, vehicleId]);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++availabilityRequest.current;
    setOverride(false);
    setOverrideReason("");
    if (!availabilityRelevant || !validRange) {
      setAvailability({ status: "idle" });
      return () => controller.abort();
    }
    if (!canCheckAvailability) {
      setAvailability({ status: "permission" });
      return () => controller.abort();
    }
    if (!shouldPrecheckAvailability) {
      setAvailability({ status: "skipped" });
      return () => controller.abort();
    }
    setAvailability({ status: "checking" });
    const timeout = window.setTimeout(async () => {
      const starts = bogotaDateTimeLocalToTimestamp(startsAt);
      const ends = bogotaDateTimeLocalToTimestamp(endsAt);
      if (!starts || !ends || !employeeId) return;
      try {
        const results = await getEmployeeAvailability({ starts_at: starts, ends_at: ends, employee_ids: [employeeId] }, controller.signal);
        if (request !== availabilityRequest.current) return;
        const result = results.find((row) => row.employee.id === employeeId);
        if (!result) setAvailability({ status: "error", message: "No se recibió disponibilidad para el empleado seleccionado." });
        else if (result.available) setAvailability({ status: "available" });
        else setAvailability({ status: "unavailable", reasons: result.reason_codes });
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
  }, [availabilityRelevant, canCheckAvailability, employeeId, endsAt, shouldPrecheckAvailability, startsAt, validRange]);

  const fieldError = (field: string) => errors[field]?.[0];
  const outsideOnly = availability.status === "unavailable" && availability.reasons.length === 1 && availability.reasons[0] === "outside_work_schedule";
  const hardBlocked = availability.status === "unavailable" && !outsideOnly;
  const selectedBranch = selectedEmployee?.branch;
  const employeeBranchHelp = selectedEmployee
    ? selectedBranch ? `Sede que tomará el backend: ${selectedBranch.name} · ${selectedBranch.code}` : "Este empleado no tiene sede activa; el backend rechazará una cita operacional."
    : "La sede se deriva del responsable y no se envía en el formulario.";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError("");
    setErrors({});
    if (!title.trim() && !isReschedule) { setErrors({ title: ["El título es obligatorio."] }); return; }
    if (!startsAt || !endsAt) { setErrors({ ends_at: ["Completa inicio y fin de la cita."] }); return; }
    if (!isSameLocalDateTimeDay(startsAt, endsAt)) { setErrors({ ends_at: ["La cita debe iniciar y terminar el mismo día en Colombia."] }); return; }
    if (!isDateTimeRangeValid(startsAt, endsAt)) { setErrors({ ends_at: ["La fecha final debe ser posterior a la inicial."] }); return; }
    if (availability.status === "checking") { setError("Espera a que termine la consulta de disponibilidad."); return; }
    if (hardBlocked) { setError("El conflicto de disponibilidad indicado no admite override."); return; }
    if (outsideOnly && !override) { setError("Ajusta el horario o confirma el override fuera de jornada."); return; }
    if (override && !overrideReason.trim()) { setErrors({ availability_override_reason: ["El motivo del override es obligatorio."] }); return; }
    const startTimestamp = bogotaDateTimeLocalToTimestamp(startsAt);
    const endTimestamp = bogotaDateTimeLocalToTimestamp(endsAt);
    if (!startTimestamp || !endTimestamp) { setError("No se pudo interpretar la fecha en hora de Colombia."); return; }

    const availabilityOverride = override ? { availability_override: true as const, availability_override_reason: overrideReason.trim() } : {};
    setSaving(true);
    try {
      let savedAppointment: AdminAppointment;
      if (isReschedule && appointment) {
        const payload: RescheduleAppointmentPayload = { starts_at: startTimestamp, ends_at: endTimestamp, ...availabilityOverride };
        savedAppointment = await rescheduleAppointment(appointment.id, payload);
      } else if (isCreate) {
        const payload: CreateAppointmentPayload = {
          customer_id: customerId,
          customer_vehicle_id: vehicleId,
          service_id: serviceId,
          responsible_employee_id: employeeId,
          status,
          title: title.trim(),
          description: description.trim() || null,
          contact_name: contactName.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          vehicle_description: vehicleDescription.trim() || null,
          starts_at: startTimestamp,
          ends_at: endTimestamp,
          ...availabilityOverride,
        };
        savedAppointment = await createAppointment(payload);
      } else if (appointment) {
        const payload: UpdateAppointmentPayload = {
          customer_id: customerId,
          customer_vehicle_id: vehicleId,
          service_id: serviceId,
          responsible_employee_id: employeeId,
          title: title.trim(),
          description: description.trim() || null,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim() || null,
          vehicle_description: vehicleDescription.trim() || null,
          ...availabilityOverride,
        };
        savedAppointment = await updateAppointment(appointment.id, payload);
      } else {
        return;
      }
      onSaved(isCreate ? "Cita creada correctamente." : isReschedule ? "Cita reprogramada correctamente." : "Cita actualizada correctamente.", savedAppointment);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.errors);
        const reasons = reasonsFromError(cause);
        if (reasons.length) setAvailability({ status: "unavailable", reasons });
      }
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la cita.");
    } finally {
      setSaving(false);
    }
  };

  const titleText = isCreate ? "Nueva cita" : isReschedule ? "Reprogramar cita" : "Editar cita";
  return <CrmDialog open titleId="appointment-form-title" onClose={onClose} busy={saving} className="appointment-dialog">
    <form className="appointment-form" onSubmit={submit} noValidate aria-busy={saving}>
      <header><div><span>Agenda operativa</span><h2 id="appointment-form-title" data-dialog-initial tabIndex={-1}>{titleText}</h2></div><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      <div className="appointment-form__body">
        {!isReschedule ? <><EmployeeSelector value={employeeId} onChange={(employee) => { setSelectedEmployee(employee); setEmployeeId(employee?.id ?? null); }} onResolved={setSelectedEmployee} disabled={saving} label="Responsable" validationError={fieldError("responsible_employee_id")} validationErrorId="appointment-employee-error" /><p className="appointment-form__hint">{employeeBranchHelp}</p>
          <div className="appointment-form__grid"><label><span>Cliente</span><select value={customerId ?? ""} disabled={saving || loadingOptions} aria-invalid={Boolean(fieldError("customer_id"))} onChange={(event) => { setCustomerId(event.target.value ? Number(event.target.value) : null); setVehicleId(null); }}><option value="">Contacto manual</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select>{fieldError("customer_id") ? <small className="appointment-field-error">{fieldError("customer_id")}</small> : null}</label><label><span>Vehículo</span><select value={vehicleId ?? ""} disabled={saving || !customerId || !vehicles.length} aria-invalid={Boolean(fieldError("customer_vehicle_id"))} onChange={(event) => setVehicleId(event.target.value ? Number(event.target.value) : null)}><option value="">Sin vehículo registrado</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicleLabel(vehicle)}</option>)}</select>{fieldError("customer_vehicle_id") ? <small className="appointment-field-error">{fieldError("customer_vehicle_id")}</small> : null}</label></div>
          <div className="appointment-form__grid"><label><span>Servicio</span><select value={serviceId ?? ""} disabled={saving || loadingOptions} aria-invalid={Boolean(fieldError("service_id"))} onChange={(event) => setServiceId(event.target.value ? Number(event.target.value) : null)}><option value="">Sin servicio asociado</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>{fieldError("service_id") ? <small className="appointment-field-error">{fieldError("service_id")}</small> : null}</label>{isCreate ? <label><span>Estado inicial</span><select value={status} disabled={saving} onChange={(event) => setStatus(event.target.value as "requested" | "confirmed")}><option value="confirmed">Confirmada</option><option value="requested">Solicitada</option></select></label> : null}</div>
          <label><span>Título</span><input required maxLength={180} value={title} disabled={saving} aria-invalid={Boolean(fieldError("title"))} onChange={(event) => setTitle(event.target.value)} />{fieldError("title") ? <small className="appointment-field-error">{fieldError("title")}</small> : null}</label>
          <label><span>Descripción</span><textarea value={description} disabled={saving} aria-invalid={Boolean(fieldError("description"))} onChange={(event) => setDescription(event.target.value)} />{fieldError("description") ? <small className="appointment-field-error">{fieldError("description")}</small> : null}</label>
          <div className="appointment-form__grid"><label><span>Contacto</span><input maxLength={160} value={contactName} disabled={saving} aria-invalid={Boolean(fieldError("contact_name"))} onChange={(event) => setContactName(event.target.value)} />{fieldError("contact_name") ? <small className="appointment-field-error">{fieldError("contact_name")}</small> : null}</label><label><span>Teléfono</span><input maxLength={40} value={contactPhone} disabled={saving} aria-invalid={Boolean(fieldError("contact_phone"))} onChange={(event) => setContactPhone(event.target.value)} />{fieldError("contact_phone") ? <small className="appointment-field-error">{fieldError("contact_phone")}</small> : null}</label></div>
          <div className="appointment-form__grid"><label><span>Email</span><input type="email" maxLength={160} value={contactEmail} disabled={saving} aria-invalid={Boolean(fieldError("contact_email"))} onChange={(event) => setContactEmail(event.target.value)} />{fieldError("contact_email") ? <small className="appointment-field-error">{fieldError("contact_email")}</small> : null}</label><label><span>Vehículo snapshot</span><input maxLength={255} value={vehicleDescription} disabled={saving} aria-invalid={Boolean(fieldError("vehicle_description"))} onChange={(event) => setVehicleDescription(event.target.value)} />{fieldError("vehicle_description") ? <small className="appointment-field-error">{fieldError("vehicle_description")}</small> : null}</label></div></> : null}
        <fieldset className="appointment-form__schedule"><legend>Horario · Colombia</legend><div className="appointment-form__grid"><label><span>Inicio</span><input required type="datetime-local" value={startsAt} disabled={saving} aria-invalid={Boolean(fieldError("starts_at"))} onChange={(event) => setStartsAt(event.target.value)} />{fieldError("starts_at") ? <small className="appointment-field-error">{fieldError("starts_at")}</small> : null}</label><label><span>Fin</span><input required type="datetime-local" value={endsAt} disabled={saving} aria-invalid={Boolean(fieldError("ends_at"))} onChange={(event) => setEndsAt(event.target.value)} />{fieldError("ends_at") ? <small className="appointment-field-error">{fieldError("ends_at")}</small> : null}</label></div><AvailabilityBlock state={availability} outsideOnly={outsideOnly} override={override} overrideReason={overrideReason} disabled={saving} reasonError={fieldError("availability_override_reason")} onOverride={setOverride} onReason={setOverrideReason} /></fieldset>
        {error ? <p className="appointment-form__error" role="alert">{error}</p> : null}
      </div>
      <footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving || availability.status === "checking"}>{saving ? "Guardando..." : isCreate ? "Crear cita" : "Guardar cambios"}</button></footer>
    </form>
  </CrmDialog>;
};

type AvailabilityState =
  | { status: "idle" | "checking" | "available" | "skipped" | "permission" }
  | { status: "unavailable"; reasons: AvailabilityReasonCode[] }
  | { status: "error"; message: string };

const reasonsFromError = (error: ApiError) => {
  const metadataReasons = Array.isArray(error.metadata.reason_codes) ? error.metadata.reason_codes : [];
  const validationValues = Object.values(error.errors).flat();
  return [...new Set([...metadataReasons, ...validationValues].filter(
    (value): value is AvailabilityReasonCode => typeof value === "string" && reasonCodes.includes(value as AvailabilityReasonCode),
  ))];
};

const AvailabilityBlock = ({ state, outsideOnly, override, overrideReason, disabled, reasonError, onOverride, onReason }: {
  state: AvailabilityState;
  outsideOnly: boolean;
  override: boolean;
  overrideReason: string;
  disabled: boolean;
  reasonError?: string;
  onOverride: (value: boolean) => void;
  onReason: (value: string) => void;
}) => {
  if (state.status === "idle") return <div className="appointment-availability is-neutral"><strong>Disponibilidad pendiente</strong><p>Completa responsable y horario para consultar el backend.</p></div>;
  if (state.status === "checking") return <div className="appointment-availability is-neutral" role="status"><strong>Consultando disponibilidad...</strong></div>;
  if (state.status === "permission") return <div className="appointment-availability is-neutral"><strong>Sin permiso para prevalidar</strong><p>El backend validará la disponibilidad al guardar.</p></div>;
  if (state.status === "skipped") return <div className="appointment-availability is-neutral" role="status"><strong>Validación al guardar</strong><p>Para evitar un falso conflicto con esta misma cita, el backend validará la disponibilidad al guardar.</p></div>;
  if (state.status === "available") return <div className="appointment-availability is-available" role="status"><strong>Disponible</strong><p>Empleado disponible en este horario.</p></div>;
  if (state.status === "error") return <div className="appointment-availability is-error" role="alert"><strong>No se pudo verificar</strong><p>{state.message} El backend volverá a validar al guardar.</p></div>;
  if (state.status === "unavailable") {
    return <div className={`appointment-availability ${outsideOnly ? "is-warning" : "is-blocked"}`} role="status"><strong>{outsideOnly ? "Fuera de jornada" : "No disponible"}</strong><ul>{state.reasons.map((reason) => <li key={reason}>{availabilityReasonLabel(reason)}</li>)}</ul>{outsideOnly ? <div className="appointment-availability__override"><label><input type="checkbox" checked={override} disabled={disabled} onChange={(event) => onOverride(event.target.checked)} /><span>Confirmar override fuera de jornada</span></label>{override ? <label><span>Motivo</span><textarea maxLength={255} value={overrideReason} disabled={disabled} aria-invalid={Boolean(reasonError)} onChange={(event) => onReason(event.target.value)} />{reasonError ? <small className="appointment-field-error">{reasonError}</small> : null}</label> : null}</div> : null}</div>;
  }
  return null;
};

const AppointmentDetailDialog = ({ appointmentId, appointment, loading, error, actionError, feedback, busyAction, canUpdate, canCancel, onClose, onRetry, onEdit, onReschedule, onAction, onCancel }: {
  appointmentId: number | null;
  appointment: AdminAppointment | null;
  loading: boolean;
  error: string;
  actionError: string;
  feedback: string;
  busyAction: AppointmentAction | null;
  canUpdate: boolean;
  canCancel: boolean;
  onClose: () => void;
  onRetry: () => void;
  onEdit: (appointment: AdminAppointment) => void;
  onReschedule: (appointment: AdminAppointment) => void;
  onAction: (appointment: AdminAppointment, action: AppointmentAction) => void;
  onCancel: (appointment: AdminAppointment) => void;
}) => {
  const busy = busyAction !== null;
  const terminal = appointment ? terminalStatuses.includes(appointment.status) : false;
  return <CrmDialog open={appointmentId !== null} titleId="appointment-detail-title" onClose={onClose} busy={busy} className="appointment-dialog">
    <article className="appointment-detail">
      <header><div><span>Detalle administrativo</span><h2 id="appointment-detail-title" data-dialog-initial tabIndex={-1}>{appointment?.title ?? (loading ? "Cargando cita..." : "Detalle de cita")}</h2></div><button type="button" aria-label="Cerrar" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      {loading ? <div className="appointment-detail__state" role="status">Cargando detalle...</div>
        : error ? <div className="appointment-detail__state is-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Reintentar</button></div>
          : appointment ? <div className="appointment-detail__body">
            <div className="appointment-detail__lead"><div><span>#{appointment.id}</span><strong>{employeeLabel(appointment)}</strong><small>{branchLabel(appointment)}</small></div><StatusBadge label={appointmentStatusLabel(appointment.status)} tone={statusTone(appointment.status)} /></div>
            {feedback ? <p className="appointment-detail__feedback" role="status">{feedback}</p> : null}
            {actionError ? <p className="appointment-detail__action-error" role="alert">{actionError}</p> : null}
            <dl className="appointment-detail__grid">
              <div><dt>Origen</dt><dd>{appointmentSourceLabel(appointment.source)}</dd></div>
              <div><dt>Inicio</dt><dd>{formatCrmTimestamp(appointment.starts_at)}</dd></div>
              <div><dt>Fin</dt><dd>{formatCrmTimestamp(appointment.ends_at)}</dd></div>
              <div><dt>Cliente/contacto</dt><dd>{customerLabel(appointment)}</dd></div>
              <div><dt>Teléfono</dt><dd>{appointment.contact_phone}</dd></div>
              <div><dt>Email</dt><dd>{appointment.contact_email ?? "Sin registrar"}</dd></div>
              <div><dt>Vehículo snapshot</dt><dd>{appointment.vehicle_description ?? "Sin vehículo"}</dd></div>
              <div><dt>Servicio snapshot</dt><dd>{serviceLabel(appointment)}</dd></div>
              <div><dt>Creada</dt><dd>{formatCrmTimestamp(appointment.created_at)}</dd></div>
              <div><dt>Actualizada</dt><dd>{formatCrmTimestamp(appointment.updated_at)}</dd></div>
            </dl>
            <section><h3>Descripción</h3><p>{appointment.description?.trim() || "Sin descripción."}</p></section>
            {appointment.availability_override ? <section className="appointment-detail__override"><h3>Override fuera de horario</h3><p>{appointment.availability_override_reason || "Sin motivo visible."}</p>{appointment.availability_overridden_at ? <small>{formatCrmTimestamp(appointment.availability_overridden_at)}</small> : null}</section> : null}
            {appointment.cancellation_reason ? <section className="appointment-detail__cancel"><h3>Motivo de cancelación</h3><p>{appointment.cancellation_reason}</p></section> : null}
          </div> : null}
      {appointment && !terminal ? <footer>
        {canUpdate ? <button type="button" disabled={busy} onClick={() => onEdit(appointment)}><Pencil size={16} aria-hidden="true" />Editar</button> : null}
        {canUpdate && (appointment.status === "requested" || appointment.status === "confirmed") ? <button type="button" disabled={busy} onClick={() => onReschedule(appointment)}><CalendarClock size={16} aria-hidden="true" />Reprogramar</button> : null}
        {canUpdate ? allowedActions(appointment).map((action) => <button key={action} className={action === "complete" ? "is-success" : undefined} type="button" disabled={busy} onClick={() => onAction(appointment, action)}>{actionLabel(action)}</button>) : null}
        {canCancel ? <button className="is-danger" type="button" disabled={busy} onClick={() => onCancel(appointment)}><XCircle size={16} aria-hidden="true" />Cancelar</button> : null}
      </footer> : null}
    </article>
  </CrmDialog>;
};

const AppointmentCancelDialog = ({ appointment, onClose, onCancelled }: { appointment: AdminAppointment | null; onClose: () => void; onCancelled: (appointment: AdminAppointment) => void }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!appointment || saving) return;
    setError("");
    setFieldError("");
    if (!reason.trim()) { setFieldError("El motivo de cancelación es obligatorio."); return; }
    setSaving(true);
    try {
      onCancelled(await cancelAppointment(appointment.id, reason.trim()));
    } catch (cause) {
      if (cause instanceof ApiError) setFieldError(cause.errors.cancellation_reason?.[0] ?? "");
      setError(cause instanceof Error ? cause.message : "No se pudo cancelar la cita.");
    } finally {
      setSaving(false);
    }
  };

  return <CrmDialog open={Boolean(appointment)} titleId="appointment-cancel-title" onClose={onClose} busy={saving} className="appointment-dialog"><form className="appointment-cancel" onSubmit={submit} noValidate aria-busy={saving}>
    <header><div><span>Confirmación</span><h2 id="appointment-cancel-title" data-dialog-initial tabIndex={-1}>Cancelar cita</h2></div><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    <div className="appointment-cancel__body"><p><strong>{appointment?.title}</strong> permanecerá en el histórico con estado Cancelada.</p><label><span>Motivo de cancelación</span><textarea required maxLength={255} value={reason} disabled={saving} aria-invalid={Boolean(fieldError)} onChange={(event) => setReason(event.target.value)} />{fieldError ? <small className="appointment-field-error">{fieldError}</small> : null}</label>{error ? <p className="appointment-cancel__error" role="alert">{error}</p> : null}</div>
    <footer><button type="button" disabled={saving} onClick={onClose}>Volver</button><button className="is-danger" type="submit" disabled={saving}>{saving ? "Cancelando..." : "Cancelar cita"}</button></footer>
  </form></CrmDialog>;
};
