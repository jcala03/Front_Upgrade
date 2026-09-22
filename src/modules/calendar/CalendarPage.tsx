import {
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Info,
  ListTodo,
  MapPin,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAdminCalendar, getMyCalendar } from "../../api/calendar";
import { listAllBranches } from "../../api/branches";
import { listAllEmployees } from "../../api/employees";
import { CrmDialog } from "../../components/crm/Dialog";
import { StatusBadge, type StatusBadgeTone } from "../../components/crm/StatusBadge";
import type { Branch } from "../../types/branch";
import type { CalendarEvent, CalendarEventStatus, CalendarEventType } from "../../types/calendar";
import type { Employee } from "../../types/employee";
import { CRM_TIME_ZONE, formatCrmTimestamp, formatDateOnly, timestampToBogotaDateTimeLocal } from "../../utils/crmDateTime";
import { appointmentStatusLabel, leaveTypeLabel, taskPriorityLabel, taskStatusLabel } from "../../utils/crmPresentation";
import "./CalendarPage.css";

type CalendarMode = "admin" | "my";
type CalendarView = "week" | "agenda";

type CalendarPageProps = { mode: CalendarMode };

type EventTypeInfo = {
  label: string;
  shortLabel: string;
  icon: ReactNode;
  tone: StatusBadgeTone;
};

const allTypes: CalendarEventType[] = ["appointment", "task", "leave", "work_schedule", "schedule_override"];
const branchTypes: CalendarEventType[] = ["appointment", "task"];
const allStatuses: CalendarEventStatus[] = ["requested", "confirmed", "in_progress", "completed", "cancelled", "no_show", "pending"];

const typeInfo: Record<CalendarEventType, EventTypeInfo> = {
  appointment: { label: "Cita", shortLabel: "Cita", icon: <CalendarCheck size={15} aria-hidden="true" />, tone: "info" },
  task: { label: "Tarea", shortLabel: "Tarea", icon: <ListTodo size={15} aria-hidden="true" />, tone: "warning" },
  leave: { label: "Ausencia", shortLabel: "Ausencia", icon: <CalendarOff size={15} aria-hidden="true" />, tone: "danger" },
  work_schedule: { label: "Horario laboral", shortLabel: "Horario", icon: <Clock3 size={15} aria-hidden="true" />, tone: "success" },
  schedule_override: { label: "Ajuste de horario", shortLabel: "Ajuste", icon: <SlidersHorizontal size={15} aria-hidden="true" />, tone: "neutral" },
};

const statusTone = (status: string | null): StatusBadgeTone => {
  if (!status) return "neutral";
  if (["completed", "approved"].includes(status)) return "success";
  if (["confirmed", "in_progress"].includes(status)) return "info";
  if (["requested", "pending"].includes(status)) return "warning";
  if (["cancelled", "no_show"].includes(status)) return "danger";
  return "neutral";
};

const statusLabel = (status: string | null) => {
  if (!status) return "Sin estado";
  if (status === "approved") return "Aprobada";
  if (["requested", "confirmed", "in_progress", "completed", "cancelled", "no_show"].includes(status)) {
    return appointmentStatusLabel(status as Parameters<typeof appointmentStatusLabel>[0]);
  }
  if (["pending", "in_progress", "completed", "cancelled"].includes(status)) {
    return taskStatusLabel(status as Parameters<typeof taskStatusLabel>[0]);
  }
  return status.replaceAll("_", " ");
};

const pad = (value: number) => String(value).padStart(2, "0");
const dateFromDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const toDateOnly = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const addDays = (value: string, days: number) => {
  const date = dateFromDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
};
const todayBogota = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: CRM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};
const startOfWeek = (value: string) => {
  const date = dateFromDateOnly(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return toDateOnly(date);
};
const initialView = (): CalendarView => window.matchMedia("(max-width: 640px)").matches ? "agenda" : "week";

const localDateTime = (value: string) => timestampToBogotaDateTimeLocal(value);
const localDateOnly = (value: string) => localDateTime(value)?.slice(0, 10) ?? value.slice(0, 10);
const localTimeLabel = (event: CalendarEvent) => {
  if (event.all_day) return "Todo el día";
  return `${formatCrmTimestamp(event.starts_at, { hour: "numeric", minute: "2-digit" })} – ${formatCrmTimestamp(event.ends_at, { hour: "numeric", minute: "2-digit" })}`;
};
const eventEndDate = (event: CalendarEvent) => {
  const end = localDateTime(event.ends_at);
  if (!end) return localDateOnly(event.ends_at);
  return end.endsWith("T00:00") ? addDays(end.slice(0, 10), -1) : end.slice(0, 10);
};
const eventOverlapsDate = (event: CalendarEvent, date: string) => localDateOnly(event.starts_at) <= date && eventEndDate(event) >= date;
const normalizeText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const eventSourceHref = (mode: CalendarMode, event: CalendarEvent) => {
  if (event.type === "appointment" && mode === "admin") return "/crm/appointments";
  if (event.type === "task") return mode === "admin" ? "/crm/tasks" : "/crm/me/tasks";
  if (event.type === "leave" && mode === "admin") return "/crm/leaves";
  if (["work_schedule", "schedule_override"].includes(event.type) && mode === "admin") return "/crm/schedules";
  return null;
};

const branchLabel = (event: CalendarEvent, branches: Branch[]) => {
  if (!(event.type === "appointment" || event.type === "task")) return null;
  if (!event.branch) return "Sin sede histórica";
  const option = branches.find((branch) => branch.id === event.branch?.id);
  return `${event.branch.code ? `${event.branch.code} · ` : ""}${event.branch.name}${option && !option.is_active ? " · Inactiva" : ""}`;
};

const metaLabel = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (key === "priority" && typeof value === "string") return ["Prioridad", taskPriorityLabel(value as Parameters<typeof taskPriorityLabel>[0])];
  if (key === "due_at" && typeof value === "string") return ["Vence", formatCrmTimestamp(value)];
  if (key === "service_name") return ["Servicio", String(value)];
  if (key === "vehicle_description") return ["Vehículo", String(value)];
  if (key === "contact_name") return ["Contacto", String(value)];
  if (key === "leave_type" && typeof value === "string") return ["Tipo de ausencia", leaveTypeLabel(value as Parameters<typeof leaveTypeLabel>[0])];
  if (key === "override_type") return ["Tipo de ajuste", value === "non_working" ? "No laborable" : "Horario excepcional"];
  if (key === "source") return ["Origen", value === "public_web" ? "Web pública" : "CRM"];
  if (["customer_id", "customer_vehicle_id", "service_id"].includes(key)) return null;
  return [key.replaceAll("_", " "), Array.isArray(value) ? value.join(", ") : String(value)];
};

const CalendarState = ({ icon, title, description, retry, status, error = false }: {
  icon?: ReactNode;
  title?: string;
  description?: string;
  retry?: () => void;
  status?: string;
  error?: boolean;
}) => <div className={`calendar-state ${error ? "is-error" : ""}`} role={error ? "alert" : status ? "status" : undefined}>
  {icon}
  {title ? <strong>{title}</strong> : null}
  {description ? <p>{description}</p> : null}
  {status ? <span>{status}</span> : null}
  {retry ? <button type="button" onClick={retry}>Reintentar</button> : null}
</div>;

const EventBadge = ({ event }: { event: CalendarEvent }) => <StatusBadge label={typeInfo[event.type].shortLabel} tone={typeInfo[event.type].tone} icon={typeInfo[event.type].icon} />;

const EventCard = ({ event, branches, compact = false, onOpen }: { event: CalendarEvent; branches: Branch[]; compact?: boolean; onOpen: () => void }) => {
  const branch = branchLabel(event, branches);
  return <button type="button" className={`calendar-event-card calendar-event-card--${event.type}`} onClick={onOpen} aria-label={`Ver ${typeInfo[event.type].label.toLowerCase()}: ${event.title}`}>
    <span className="calendar-event-card__time">{localTimeLabel(event)}</span>
    <span className="calendar-event-card__title">{event.title}</span>
    <span className="calendar-event-card__badges"><EventBadge event={event} />{event.status ? <StatusBadge label={statusLabel(event.status)} tone={statusTone(event.status)} /> : null}</span>
    {!compact && event.employee ? <span className="calendar-event-card__meta"><UserRound size={14} aria-hidden="true" />{event.employee.name}</span> : null}
    {!compact && branch ? <span className="calendar-event-card__meta"><MapPin size={14} aria-hidden="true" />{branch}</span> : null}
  </button>;
};

const WeekView = ({ days, events, branches, today, onOpen }: { days: string[]; events: CalendarEvent[]; branches: Branch[]; today: string; onOpen: (event: CalendarEvent) => void }) => (
  <div className="calendar-week" aria-label="Vista semanal">
    {days.map((day) => {
      const dayEvents = events.filter((event) => eventOverlapsDate(event, day));
      const isToday = day === today;
      return <section className={`calendar-week__day ${isToday ? "is-today" : ""}`} key={day} aria-labelledby={`calendar-day-${day}`}>
        <header>
          <span>{new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "UTC" }).format(dateFromDateOnly(day))}</span>
          <h3 id={`calendar-day-${day}`}>{formatDateOnly(day)}</h3>
          {isToday ? <small aria-current="date">Hoy</small> : null}
        </header>
        {dayEvents.length ? <div className="calendar-week__events">
          {dayEvents.map((event) => <EventCard key={`${day}-${event.id}`} event={event} branches={branches} compact onOpen={() => onOpen(event)} />)}
        </div> : <p>Sin eventos</p>}
      </section>;
    })}
  </div>
);

const AgendaView = ({ days, events, branches, emptyText, today, onOpen }: { days: string[]; events: CalendarEvent[]; branches: Branch[]; emptyText: string; today: string; onOpen: (event: CalendarEvent) => void }) => {
  const hasEvents = events.length > 0;
  if (!hasEvents) return <CalendarState icon={<CalendarDays size={28} aria-hidden="true" />} title={emptyText} />;

  return <div className="calendar-agenda" aria-label="Agenda cronológica">
    {days.map((day) => {
      const dayEvents = events.filter((event) => eventOverlapsDate(event, day));
      if (!dayEvents.length) return null;
      return <section className="calendar-agenda__day" key={day} aria-labelledby={`calendar-agenda-${day}`}>
        <h3 id={`calendar-agenda-${day}`}>{formatDateOnly(day)}{day === today ? <span aria-current="date">Hoy</span> : null}</h3>
        <div>{dayEvents.map((event) => <EventCard key={`${day}-${event.id}`} event={event} branches={branches} onOpen={() => onOpen(event)} />)}</div>
      </section>;
    })}
  </div>;
};

const EventDetailDialog = ({ mode, event, branches, onClose }: { mode: CalendarMode; event: CalendarEvent | null; branches: Branch[]; onClose: () => void }) => {
  const href = event ? eventSourceHref(mode, event) : null;
  const branch = event ? branchLabel(event, branches) : null;
  const metaRows = event ? Object.entries(event.meta ?? {}).flatMap(([key, value]) => {
    const label = metaLabel(key, value);
    return label ? [label] : [];
  }) : [];

  return <CrmDialog open={event !== null} titleId="calendar-event-detail-title" onClose={onClose} className="calendar-event-dialog">
    {event ? <article className="calendar-event-detail">
      <header>
        <div>
          <span>{typeInfo[event.type].label}</span>
          <h2 id="calendar-event-detail-title" data-dialog-initial tabIndex={-1}>{event.title}</h2>
        </div>
        <button type="button" aria-label="Cerrar detalle" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="calendar-event-detail__body">
        <div className="calendar-event-detail__badges"><EventBadge event={event} />{event.status ? <StatusBadge label={statusLabel(event.status)} tone={statusTone(event.status)} /> : null}</div>
        <dl className="calendar-event-detail__grid">
          <div><dt>Inicio</dt><dd><time dateTime={event.starts_at}>{formatCrmTimestamp(event.starts_at)}</time></dd></div>
          <div><dt>Fin</dt><dd><time dateTime={event.ends_at}>{event.all_day ? "Todo el día" : formatCrmTimestamp(event.ends_at)}</time></dd></div>
          <div><dt>Empleado</dt><dd>{event.employee?.name ?? "Sin empleado visible"}</dd></div>
          {branch ? <div><dt>Sede histórica</dt><dd>{branch}</dd></div> : null}
        </dl>
        {event.type === "leave" || event.type === "work_schedule" || event.type === "schedule_override" ? <p className="calendar-event-detail__note"><Info size={16} aria-hidden="true" />Esta fuente pertenece al empleado y no tiene sede histórica.</p> : null}
        {metaRows.length ? <dl className="calendar-event-detail__grid is-meta">
          {metaRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl> : null}
      </div>
      <footer>
        {href ? <a href={href}>{event.type === "appointment" ? "Ver citas" : event.type === "task" ? "Ver tareas" : event.type === "leave" ? "Ver ausencias" : "Ver horarios"}</a> : null}
        <button type="button" onClick={onClose}>Cerrar</button>
      </footer>
    </article> : null}
  </CrmDialog>;
};

const CalendarPage = ({ mode }: CalendarPageProps) => {
  const today = useMemo(todayBogota, []);
  const [view, setView] = useState<CalendarView>(initialView);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayBogota()));
  const [branchId, setBranchId] = useState<number | "">("");
  const [selectedTypes, setSelectedTypes] = useState<CalendarEventType[]>(allTypes);
  const [selectedStatuses, setSelectedStatuses] = useState<CalendarEventStatus[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeLinked, setEmployeeLinked] = useState<boolean | null>(mode === "my" ? null : true);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(mode === "admin");
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestId = useRef(0);
  const optionsRequestId = useRef(0);

  const branchSelected = mode === "admin" && branchId !== "";
  const availableTypes = branchSelected ? branchTypes : allTypes;
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const from = `${weekStart}T00:00:00`;
  const to = `${addDays(weekStart, 7)}T00:00:00`;
  const rangeLabel = `${formatDateOnly(weekStart)} – ${formatDateOnly(addDays(weekStart, 6))}`;
  const filteredEmployees = useMemo(() => {
    const search = normalizeText(employeeSearch.trim());
    if (!search) return employees;
    return employees.filter((employee) => normalizeText(`${employee.name} ${employee.job_title} ${employee.branch?.name ?? ""}`).includes(search));
  }, [employeeSearch, employees]);

  useEffect(() => {
    if (mode !== "admin") return;
    const controller = new AbortController();
    const request = ++optionsRequestId.current;
    setOptionsLoading(true);
    setOptionsError("");
    Promise.all([listAllBranches(controller.signal), listAllEmployees(controller.signal)])
      .then(([branchRows, employeeRows]) => {
        if (request !== optionsRequestId.current) return;
        setBranches(branchRows);
        setEmployees(employeeRows);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (request === optionsRequestId.current) setOptionsError(cause instanceof Error ? cause.message : "No se pudieron cargar los filtros.");
      })
      .finally(() => {
        if (request === optionsRequestId.current) setOptionsLoading(false);
      });
    return () => controller.abort();
  }, [mode]);

  useEffect(() => {
    if (!branchSelected) return;
    setSelectedTypes((current) => {
      const compatible = current.filter((type) => branchTypes.includes(type));
      return compatible.length ? compatible : branchTypes;
    });
  }, [branchSelected]);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++requestId.current;
    setLoading(true);
    setError("");
    const compatibleTypes = selectedTypes.filter((type) => availableTypes.includes(type));
    const filters = {
      from,
      to,
      types: compatibleTypes.length === availableTypes.length ? undefined : compatibleTypes,
      statuses: selectedStatuses.length ? selectedStatuses : undefined,
      ...(mode === "admin" ? {
        branch_id: branchId === "" ? undefined : branchId,
        employee_ids: selectedEmployeeIds.length ? selectedEmployeeIds : undefined,
      } : {}),
    };
    const requestPromise = mode === "admin" ? getAdminCalendar(filters, controller.signal) : getMyCalendar(filters, controller.signal);
    requestPromise
      .then((response) => {
        if (request !== requestId.current) return;
        setEvents(response.data);
        setEmployeeLinked(response.meta.employee_linked ?? true);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (request === requestId.current) {
          setEvents([]);
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el calendario.");
        }
      })
      .finally(() => {
        if (request === requestId.current) setLoading(false);
      });
    return () => controller.abort();
  }, [availableTypes, branchId, from, mode, refreshVersion, selectedEmployeeIds, selectedStatuses, selectedTypes, to]);

  const toggleType = (type: CalendarEventType) => {
    setSelectedTypes((current) => {
      const without = current.filter((item) => item !== type);
      if (without.length === current.length) return [...current, type].filter((item) => availableTypes.includes(item));
      return without.length ? without : current;
    });
  };

  const toggleStatus = (status: CalendarEventStatus) => setSelectedStatuses((current) => current.includes(status) ? current.filter((item) => item !== status) : [...current, status]);
  const toggleEmployee = (id: number) => setSelectedEmployeeIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const clearFilters = () => {
    setBranchId("");
    setSelectedTypes(allTypes);
    setSelectedStatuses([]);
    setSelectedEmployeeIds([]);
    setEmployeeSearch("");
  };
  const moveRange = (daysDelta: number) => setWeekStart((current) => addDays(current, daysDelta));
  const goToday = () => setWeekStart(startOfWeek(todayBogota()));
  const emptyText = mode === "my" ? "No tienes eventos en este período." : branchSelected ? "No hay citas ni tareas de esta sede en este período." : "No hay eventos en este período.";
  const hasFilters = branchSelected || selectedEmployeeIds.length > 0 || selectedStatuses.length > 0 || selectedTypes.length !== allTypes.length;

  const filtersMarkup = <section className="calendar-filters" aria-labelledby="calendar-filters-title">
    <div className="calendar-filters__heading">
      <div><Filter size={16} aria-hidden="true" /><h3 id="calendar-filters-title">Filtros</h3></div>
      {hasFilters ? <button type="button" onClick={clearFilters}>Limpiar</button> : null}
    </div>
    {mode === "admin" ? <div className="calendar-filters__grid">
      <label>
        <span>Sede</span>
        <select value={branchId} disabled={optionsLoading} onChange={(event) => { setBranchId(event.target.value ? Number(event.target.value) : ""); setFiltersOpen(false); }}>
          <option value="">Todas las sedes</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}{branch.is_active ? "" : " · Inactiva"}</option>)}
        </select>
      </label>
      <label className="calendar-employee-search">
        <span>Buscar empleado</span>
        <div><Search size={16} aria-hidden="true" /><input value={employeeSearch} disabled={optionsLoading} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Nombre, cargo o sede actual" /></div>
      </label>
    </div> : null}
    {mode === "admin" ? <fieldset className="calendar-check-list"><legend>Empleados</legend>
      {optionsLoading ? <span role="status">Cargando empleados...</span> : filteredEmployees.length ? filteredEmployees.slice(0, 60).map((employee) => <label key={employee.id}>
        <input type="checkbox" checked={selectedEmployeeIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
        <span>{employee.name}<small>{employee.branch?.name ?? "Sin sede actual"}</small></span>
      </label>) : <p>No hay empleados para mostrar.</p>}
      {filteredEmployees.length > 60 ? <small>Mostrando 60 de {filteredEmployees.length}. Usa la búsqueda para acotar la lista.</small> : null}
    </fieldset> : null}
    <fieldset className="calendar-check-list is-inline"><legend>Fuentes</legend>
      {availableTypes.map((type) => <label key={type}>
        <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
        <span>{typeInfo[type].label}</span>
      </label>)}
    </fieldset>
    <fieldset className="calendar-check-list is-inline"><legend>Estado de citas/tareas</legend>
      {allStatuses.map((status) => <label key={status}>
        <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleStatus(status)} />
        <span>{statusLabel(status)}</span>
      </label>)}
    </fieldset>
    {optionsError ? <p className="calendar-feedback is-error" role="alert">{optionsError}</p> : null}
  </section>;

  return <section className={`calendar-page calendar-page--${mode}`} aria-labelledby="calendar-page-title">
    <header className="calendar-page__header">
      <div>
        <span>{mode === "admin" ? "Operación" : "Mi espacio"}</span>
        <h2 id="calendar-page-title">{mode === "admin" ? "Calendario" : "Mi calendario"}</h2>
        <p>{mode === "admin" ? "Consulta la agenda operativa por rango, empleado, fuente y sede histórica." : "Consulta tus citas, tareas, ausencias y horarios propios."}</p>
      </div>
    </header>

    <section className="calendar-toolbar" aria-label="Navegación del calendario">
      <div className="calendar-view-toggle" role="tablist" aria-label="Vista">
        <button type="button" role="tab" aria-selected={view === "week"} className={view === "week" ? "is-active" : ""} onClick={() => setView("week")}>Semana</button>
        <button type="button" role="tab" aria-selected={view === "agenda"} className={view === "agenda" ? "is-active" : ""} onClick={() => setView("agenda")}>Agenda</button>
      </div>
      <nav className="calendar-range-nav" aria-label="Cambiar semana">
        <button type="button" onClick={() => moveRange(-7)}><ChevronLeft size={17} aria-hidden="true" />Anterior</button>
        <button type="button" onClick={goToday}>Hoy</button>
        <button type="button" onClick={() => moveRange(7)}>Siguiente<ChevronRight size={17} aria-hidden="true" /></button>
      </nav>
      <div className="calendar-range-summary"><span>{rangeLabel}</span><small>Zona horaria: Bogotá</small></div>
      {mode === "admin" ? <button className="calendar-mobile-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="calendar-filter-panel" onClick={() => setFiltersOpen((current) => !current)}><Filter size={16} aria-hidden="true" />Filtros</button> : null}
    </section>

    {mode === "admin" ? <div id="calendar-filter-panel" className={`calendar-filter-panel ${filtersOpen ? "is-open" : ""}`}>{filtersMarkup}</div> : filtersMarkup}

    <section className="calendar-context" aria-live="polite">
      <Info size={17} aria-hidden="true" />
      <p>{branchSelected ? "En la vista por sede se muestran citas y tareas asociadas históricamente a esta sede. Las ausencias y horarios pertenecen al empleado y se consultan en la vista general o en Mi calendario." : mode === "admin" ? "Vista general: pueden aparecer citas, tareas, ausencias, horarios laborales y ajustes. No todos los eventos tienen sede histórica." : "Vista personal: el backend limita la consulta al empleado autenticado y mantiene las cinco fuentes propias."}</p>
    </section>

    {error && events.length ? <div className="calendar-feedback is-error" role="alert"><span>{error}</span><button type="button" onClick={() => setRefreshVersion((current) => current + 1)}><RefreshCcw size={15} aria-hidden="true" />Reintentar</button></div> : null}
    {loading && events.length ? <span className="sr-only" role="status">Actualizando calendario...</span> : null}

    {loading && !events.length ? <CalendarState icon={<CalendarDays size={28} aria-hidden="true" />} status="Cargando calendario..." />
      : error && !events.length ? <CalendarState title="No pudimos cargar el calendario" description={error} retry={() => setRefreshVersion((current) => current + 1)} error />
        : mode === "my" && employeeLinked === false ? <CalendarState icon={<UserRound size={28} aria-hidden="true" />} title="No tienes un perfil de empleado asociado." description="Cuando tu cuenta sea vinculada a un empleado, tus eventos aparecerán aquí." />
          : <div className={`calendar-content ${loading ? "is-updating" : ""}`} aria-busy={loading}>
            {view === "week" ? events.length ? <WeekView days={days} events={events} branches={branches} today={today} onOpen={setSelectedEvent} /> : <CalendarState icon={<CalendarDays size={28} aria-hidden="true" />} title={emptyText} /> : <AgendaView days={days} events={events} branches={branches} emptyText={emptyText} today={today} onOpen={setSelectedEvent} />}
          </div>}

    <EventDetailDialog mode={mode} event={selectedEvent} branches={branches} onClose={() => setSelectedEvent(null)} />
  </section>;
};

export const AdminCalendarPage = () => <CalendarPage mode="admin" />;
export const MyCalendarPage = () => <CalendarPage mode="my" />;
