import {
  BadgeDollarSign,
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  FileText,
  ListTodo,
  RefreshCcw,
  ShoppingBag,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getMyCalendar } from "../../../api/calendar";
import { getMyCommissionSummary } from "../../../api/commissions";
import { getMyGoals } from "../../../api/goals";
import { getMyTasks } from "../../../api/myTasks";
import { listMyQuotations } from "../../../api/myQuotations";
import { listMySales } from "../../../api/mySales";
import { getNotifications } from "../../../api/notifications";
import type { CalendarEvent } from "../../../types/calendar";
import type { MyCommissionSummary } from "../../../types/commission";
import type { Goal } from "../../../types/goal";
import type { CrmNotification } from "../../../types/notification";
import type { MyTask } from "../../../types/task";
import { getAuthUser, hasPermission } from "../../../utils/authStorage";
import { CRM_TIME_ZONE, formatCrmTimestamp, formatDateOnly } from "../../../utils/crmDateTime";
import { formatCurrency } from "../../../utils/formatCurrency";
import { taskPriorityLabel } from "../../../utils/crmPresentation";
import "./UserHomePage.css";

type Loadable<T> =
  | { status: "loading"; data: null; error: "" }
  | { status: "ready"; data: T; error: "" }
  | { status: "error"; data: null; error: string };

type PendingTaskSummary = { task: MyTask | null; total: number };
type CountSummary = { total: number };
type NotificationsSummary = { unread: number; rows: CrmNotification[] };

const loading = <T,>(): Loadable<T> => ({ status: "loading", data: null, error: "" });
const ready = <T,>(data: T): Loadable<T> => ({ status: "ready", data, error: "" });
const failed = <T,>(error: unknown): Loadable<T> => ({
  status: "error",
  data: null,
  error: error instanceof Error ? error.message : "No fue posible cargar esta información.",
});

const todayFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: CRM_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const isoAfterDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000).toISOString();
const paginatorTotal = (value: { total: number } | []) => Array.isArray(value) ? 0 : value.total;
const numeric = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const CardShell = ({
  icon,
  eyebrow,
  title,
  href,
  linkLabel,
  className = "",
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
  className?: string;
  children: ReactNode;
}) => (
  <article className={`user-home-card ${className}`.trim()}>
    <header>
      <span className="user-home-card__icon" aria-hidden="true">{icon}</span>
      <span>
        <small>{eyebrow}</small>
        <h3>{title}</h3>
      </span>
    </header>
    <div className="user-home-card__body">{children}</div>
    <a className="user-home-card__link" href={href}>
      {linkLabel}
      <ChevronRight size={17} aria-hidden="true" />
    </a>
  </article>
);

const CardLoading = () => <p className="user-home-card__state" role="status">Cargando resumen…</p>;
const CardError = ({ message }: { message: string }) => <p className="user-home-card__state is-error" role="alert">{message}</p>;
const CardEmpty = ({ children }: { children: ReactNode }) => <p className="user-home-card__state is-empty">{children}</p>;

export const UserHomePage = () => {
  const user = getAuthUser();
  const employee = user?.employee ?? null;
  const canViewQuotations = hasPermission("quotations.view_own");
  const canViewSales = hasPermission("orders.view_own");
  const canViewCommissions = hasPermission("commissions.view_own");
  const canViewNotifications = hasPermission("notifications.view");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [appointment, setAppointment] = useState<Loadable<CalendarEvent | null>>(loading);
  const [tasks, setTasks] = useState<Loadable<PendingTaskSummary>>(loading);
  const [goal, setGoal] = useState<Loadable<Goal | null>>(loading);
  const [quotations, setQuotations] = useState<Loadable<CountSummary>>(loading);
  const [sales, setSales] = useState<Loadable<CountSummary>>(loading);
  const [commission, setCommission] = useState<Loadable<MyCommissionSummary | null>>(loading);
  const [notifications, setNotifications] = useState<Loadable<NotificationsSummary>>(loading);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const ignoreAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";
    const now = new Date();

    if (employee) {
      setAppointment(loading());
      void getMyCalendar({
        from: now.toISOString(),
        to: isoAfterDays(now, 31),
        types: ["appointment"],
        statuses: ["requested", "confirmed"],
      }, signal)
        .then((result) => {
          const next = result.data
            .filter((event) => new Date(event.starts_at).getTime() >= now.getTime())
            .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime())[0] ?? null;
          setAppointment(ready(next));
        })
        .catch((error) => { if (!ignoreAbort(error)) setAppointment(failed(error)); });

      setTasks(loading());
      void getMyTasks({ status: "pending", page: 1, per_page: 1 }, signal)
        .then((result) => setTasks(ready({ task: result.tasks.data[0] ?? null, total: result.tasks.total })))
        .catch((error) => { if (!ignoreAbort(error)) setTasks(failed(error)); });

      setGoal(loading());
      void getMyGoals({ status: "active", page: 1, per_page: 1 }, signal)
        .then((result) => setGoal(ready(result.goals.data[0] ?? null)))
        .catch((error) => { if (!ignoreAbort(error)) setGoal(failed(error)); });
    } else {
      setAppointment(ready(null));
      setTasks(ready({ task: null, total: 0 }));
      setGoal(ready(null));
    }

    if (canViewQuotations) {
      setQuotations(loading());
      void listMyQuotations({ status: "draft", page: 1, per_page: 1 }, signal)
        .then((result) => setQuotations(ready({ total: paginatorTotal(result.quotations) })))
        .catch((error) => { if (!ignoreAbort(error)) setQuotations(failed(error)); });
    }

    if (canViewSales) {
      setSales(loading());
      void listMySales({ status: "pending", page: 1, per_page: 1 }, signal)
        .then((result) => setSales(ready({ total: paginatorTotal(result.sales) })))
        .catch((error) => { if (!ignoreAbort(error)) setSales(failed(error)); });
    }

    if (canViewCommissions) {
      setCommission(loading());
      void getMyCommissionSummary(signal)
        .then((result) => setCommission(ready(result)))
        .catch((error) => { if (!ignoreAbort(error)) setCommission(failed(error)); });
    }

    if (canViewNotifications) {
      setNotifications(loading());
      void getNotifications({ filter: "unread", page: 1, perPage: 3 })
        .then((result) => { if (!signal.aborted) setNotifications(ready({ unread: result.unread_count, rows: result.notifications.data })); })
        .catch((error) => { if (!signal.aborted) setNotifications(failed(error)); });
    }

    return () => controller.abort();
  }, [canViewCommissions, canViewNotifications, canViewQuotations, canViewSales, employee?.id, refreshVersion]);

  const taskIsOverdue = tasks.status === "ready" && tasks.data.task?.due_at
    ? new Date(tasks.data.task.due_at).getTime() < Date.now()
    : false;
  const goalProgress = goal.status === "ready" && goal.data
    ? Math.min(100, Math.max(0, numeric(goal.data.progress_percentage)))
    : 0;
  const quickActions = useMemo(() => [
    { href: "/crm/me/calendar", label: "Ver calendario", icon: <CalendarDays size={19} aria-hidden="true" /> },
    { href: "/crm/me/tasks", label: "Ver tareas", icon: <ListTodo size={19} aria-hidden="true" /> },
    ...(canViewQuotations ? [{ href: "/crm/me/quotations", label: "Mis cotizaciones", icon: <FileText size={19} aria-hidden="true" /> }] : []),
    ...(canViewSales ? [{ href: "/crm/me/sales", label: "Mis ventas", icon: <ShoppingBag size={19} aria-hidden="true" /> }] : []),
  ], [canViewQuotations, canViewSales]);

  return (
    <section className="user-home" aria-labelledby="user-home-title">
      <header className="user-home__welcome">
        <div>
          <span className="user-home__today">Hoy · {todayFormatter.format(new Date())}</span>
          <h2 id="user-home-title">Hola, {employee?.name ?? user?.name ?? "Usuario"}</h2>
          <p>{employee?.branch?.name ? `${employee.branch.name} · ` : ""}Tu resumen personal para empezar el día.</p>
        </div>
        <button type="button" onClick={() => setRefreshVersion((current) => current + 1)}>
          <RefreshCcw size={17} aria-hidden="true" />
          Actualizar
        </button>
      </header>

      <section className="user-home__section" aria-labelledby="user-home-priorities-title">
        <div className="user-home__section-heading">
          <div>
            <span>Prioridades</span>
            <h2 id="user-home-priorities-title">Lo siguiente en tu día</h2>
          </div>
        </div>
        <div className="user-home__grid is-priority">
          <CardShell icon={<CalendarClock size={21} />} eyebrow="Agenda personal" title="Próxima cita" href="/crm/me/calendar" linkLabel="Ver calendario">
            {appointment.status === "loading" ? <CardLoading /> : appointment.status === "error" ? <CardError message={appointment.error} /> : appointment.data ? <>
              <strong className="user-home-card__value is-date">{formatCrmTimestamp(appointment.data.starts_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</strong>
              <p>{String(appointment.data.meta.service_name ?? appointment.data.title)}</p>
              {appointment.data.meta.contact_name ? <small>{String(appointment.data.meta.contact_name)}</small> : null}
            </> : <CardEmpty>No tienes citas próximas en los siguientes 31 días.</CardEmpty>}
          </CardShell>

          <CardShell icon={<ListTodo size={21} />} eyebrow="Trabajo asignado" title="Tarea pendiente" href="/crm/me/tasks" linkLabel="Ver tareas">
            {tasks.status === "loading" ? <CardLoading /> : tasks.status === "error" ? <CardError message={tasks.error} /> : tasks.data.task ? <>
              <div className="user-home-card__badges">
                <span>{taskPriorityLabel(tasks.data.task.priority)}</span>
                {taskIsOverdue ? <span className="is-warning">Vencida</span> : null}
              </div>
              <strong className="user-home-card__value">{tasks.data.task.title}</strong>
              <p>{tasks.data.task.due_at ? `Límite: ${formatCrmTimestamp(tasks.data.task.due_at)}` : "Sin fecha límite"}</p>
              {tasks.data.total > 1 ? <small>+ {tasks.data.total - 1} pendiente{tasks.data.total - 1 === 1 ? "" : "s"}</small> : null}
            </> : <CardEmpty>No tienes tareas pendientes.</CardEmpty>}
          </CardShell>

          <CardShell icon={<Target size={21} />} eyebrow="Progreso personal" title="Meta activa" href="/crm/me/goals" linkLabel="Ver metas">
            {goal.status === "loading" ? <CardLoading /> : goal.status === "error" ? <CardError message={goal.error} /> : goal.data ? <>
              <strong className="user-home-card__value">{goal.data.title}</strong>
              <div className="user-home-card__progress-copy">
                <span>{numeric(goal.data.current_value)} / {numeric(goal.data.target_value)} {goal.data.unit ?? ""}</span>
                <b>{Math.round(goalProgress)}%</b>
              </div>
              <progress max="100" value={goalProgress} aria-label={`Progreso de ${goal.data.title}: ${Math.round(goalProgress)}%`} />
              <small>{goal.data.due_on ? `Finaliza ${formatDateOnly(goal.data.due_on)}` : "Sin fecha límite"}</small>
            </> : <CardEmpty>No tienes una meta activa.</CardEmpty>}
          </CardShell>
        </div>
      </section>

      {(canViewQuotations || canViewSales || canViewCommissions) ? <section className="user-home__section" aria-labelledby="user-home-commercial-title">
        <div className="user-home__section-heading">
          <div><span>Actividad propia</span><h2 id="user-home-commercial-title">Resumen comercial</h2></div>
          <p>Estados factuales de tus registros. Cada módulo conserva la autoridad.</p>
        </div>
        <div className="user-home__grid is-commercial">
          {canViewQuotations ? <CardShell icon={<FileText size={21} />} eyebrow="Mis cotizaciones" title="Borradores" href="/crm/me/quotations" linkLabel="Abrir cotizaciones">
            {quotations.status === "loading" ? <CardLoading /> : quotations.status === "error" ? <CardError message={quotations.error} /> : quotations.data.total ? <><strong className="user-home-card__metric">{quotations.data.total}</strong><p>{quotations.data.total === 1 ? "borrador propio" : "borradores propios"}</p></> : <CardEmpty>No tienes cotizaciones en borrador.</CardEmpty>}
          </CardShell> : null}
          {canViewSales ? <CardShell icon={<ShoppingBag size={21} />} eyebrow="Mis ventas" title="Pendientes" href="/crm/me/sales" linkLabel="Abrir ventas">
            {sales.status === "loading" ? <CardLoading /> : sales.status === "error" ? <CardError message={sales.error} /> : sales.data.total ? <><strong className="user-home-card__metric">{sales.data.total}</strong><p>{sales.data.total === 1 ? "venta propia pendiente de confirmación" : "ventas propias pendientes de confirmación"}</p></> : <CardEmpty>No tienes ventas pendientes de confirmación.</CardEmpty>}
          </CardShell> : null}
          {canViewCommissions ? <CardShell icon={<BadgeDollarSign size={21} />} eyebrow="Mes actual" title="Mis comisiones" href="/crm/me/commissions" linkLabel="Ver comisiones">
            {commission.status === "loading" ? <CardLoading /> : commission.status === "error" ? <CardError message={commission.error} /> : commission.data?.current_month.total_rows ? <div className="user-home-card__money"><span><small>Pendiente</small><strong>{formatCurrency(commission.data.current_month.pending_amount)}</strong></span><span><small>Ganada</small><strong>{formatCurrency(commission.data.current_month.earned_amount)}</strong></span></div> : <CardEmpty>Aún no tienes comisiones en el mes actual.</CardEmpty>}
          </CardShell> : null}
        </div>
      </section> : null}

      {canViewNotifications ? <section className="user-home__section" aria-labelledby="user-home-notifications-title">
        <div className="user-home__section-heading">
          <div><span>Novedades personales</span><h2 id="user-home-notifications-title">Notificaciones</h2></div>
        </div>
        <CardShell className="is-wide" icon={<Bell size={21} />} eyebrow="Sin leer" title="Novedades recientes" href="/crm/notifications" linkLabel="Ver todas las notificaciones">
          {notifications.status === "loading" ? <CardLoading /> : notifications.status === "error" ? <CardError message={notifications.error} /> : notifications.data.rows.length ? <>
            <strong className="user-home-card__notification-count">{notifications.data.unread} sin leer</strong>
            <ul className="user-home-card__notifications">{notifications.data.rows.map((item) => <li key={item.id}><span>{item.title}</span><small>{formatCrmTimestamp(item.created_at)}</small></li>)}</ul>
          </> : <CardEmpty>Estás al día. No tienes notificaciones sin leer.</CardEmpty>}
        </CardShell>
      </section> : null}

      <nav className="user-home__quick" aria-label="Accesos rápidos permitidos">
        <h2>Accesos rápidos</h2>
        <div>{quickActions.map((action) => <a href={action.href} key={action.href}>{action.icon}<span>{action.label}</span></a>)}</div>
      </nav>
    </section>
  );
};
