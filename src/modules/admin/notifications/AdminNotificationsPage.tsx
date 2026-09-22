import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { announceNotificationCount, getNotifications, markAllNotificationsAsRead, markNotificationAsRead, NotificationsApiError } from "../../../api/notifications";
import type { CrmNotification, CrmNotificationFilter, CrmNotificationPaginator } from "../../../types/notification";
import { hasPermission } from "../../../utils/authStorage";
import { formatNotificationDate, notificationDetails, notificationPresentation, notificationReferenceAction } from "./notificationUtils";
import "./AdminNotificationsPage.css";

const emptyPaginator: CrmNotificationPaginator = { current_page: 1, data: [], last_page: 1, per_page: 20, total: 0 };

export const AdminNotificationsPage = () => {
  const canView = hasPermission("notifications.view");
  const canUpdate = hasPermission("notifications.update");
  const [filter, setFilter] = useState<CrmNotificationFilter>("all");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<CrmNotificationPaginator>(emptyPaginator);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingIds, setMarkingIds] = useState<Set<number>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (targetPage = page, targetFilter = filter) => {
    if (!canView) { setLoading(false); return; }
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await getNotifications({ filter: targetFilter, page: targetPage, perPage: 20 });
      if (currentRequest !== requestId.current) return;
      setNotifications(result.notifications);
      setUnreadCount(result.unread_count);
      announceNotificationCount(result.unread_count);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las notificaciones.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [canView, filter, page]);

  useEffect(() => { void load(page, filter); }, [filter, load, page]);

  const changeFilter = (nextFilter: CrmNotificationFilter) => {
    if (nextFilter === filter) return;
    requestId.current += 1;
    setFilter(nextFilter);
    setPage(1);
  };

  const markOne = async (notification: CrmNotification) => {
    if (!canUpdate || notification.read_at || markingIds.has(notification.id)) return true;
    requestId.current += 1;
    setLoading(false);
    setMarkingIds((current) => new Set(current).add(notification.id));
    setError("");
    try {
      const updated = await markNotificationAsRead(notification.id);
      setNotifications((current) => {
        if (filter !== "unread") return { ...current, data: current.data.map((item) => item.id === updated.id ? updated : item) };
        const total = Math.max(0, current.total - 1);
        return { ...current, data: current.data.filter((item) => item.id !== updated.id), total, last_page: Math.max(1, Math.ceil(total / current.per_page)) };
      });
      if (filter === "unread" && notifications.data.length === 1 && page > 1) setPage((current) => current - 1);
      setUnreadCount((current) => { const next = Math.max(0, current - 1); announceNotificationCount(next); return next; });
      return true;
    } catch (cause) {
      if (cause instanceof NotificationsApiError && cause.status === 404) {
        void load(page, filter);
      }
      setError(cause instanceof Error ? cause.message : "No se pudo marcar la notificación.");
      return false;
    } finally {
      setMarkingIds((current) => { const next = new Set(current); next.delete(notification.id); return next; });
    }
  };

  const markAll = async () => {
    if (!canUpdate || unreadCount <= 0 || markingAll) return;
    requestId.current += 1;
    setLoading(false);
    setMarkingAll(true);
    setError("");
    try {
      const result = await markAllNotificationsAsRead();
      setUnreadCount(result.unread_count);
      announceNotificationCount(result.unread_count);
      if (filter === "unread") {
        setPage(1);
        setNotifications({ ...emptyPaginator });
      } else {
        const readAt = new Date().toISOString();
        setNotifications((current) => ({ ...current, data: current.data.map((item) => item.read_at ? item : { ...item, read_at: readAt }) }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron marcar las notificaciones.");
    } finally {
      setMarkingAll(false);
    }
  };

  const navigate = async (notification: CrmNotification, href: string) => {
    if (!notification.read_at && canUpdate) await markOne(notification);
    window.location.href = href;
  };

  if (!canView) return <section className="notifications-state notifications-state--error"><strong>Acceso restringido</strong><p>No tienes permiso para consultar notificaciones.</p></section>;
  if (loading && notifications.total === 0 && !error) return <section className="notifications-state" role="status"><Bell size={22} aria-hidden="true" /><strong>Cargando notificaciones...</strong></section>;
  if (error && notifications.total === 0) return <section className="notifications-state notifications-state--error" role="alert"><strong>No pudimos cargar las notificaciones</strong><p>{error}</p><button type="button" onClick={() => void load(page, filter)}>Reintentar</button></section>;

  return (
    <section className="admin-notifications" aria-labelledby="notifications-title">
      <header className="admin-notifications__header">
        <div><span>Centro personal</span><h2 id="notifications-title">Notificaciones</h2><p>Alertas y eventos importantes del CRM.</p></div>
        {canUpdate && unreadCount > 0 ? <button type="button" className="notifications-mark-all" disabled={markingAll} onClick={() => void markAll()}><CheckCheck size={17} aria-hidden="true" />{markingAll ? "Marcando..." : "Marcar todas como leídas"}</button> : null}
      </header>

      <div className="notifications-toolbar">
        <div className="notifications-filters" role="group" aria-label="Filtrar notificaciones">
          <button type="button" className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => changeFilter("all")}>Todas</button>
          <button type="button" className={filter === "unread" ? "is-active" : ""} aria-pressed={filter === "unread"} onClick={() => changeFilter("unread")}>No leídas{unreadCount > 0 ? ` · ${unreadCount}` : ""}</button>
        </div>
        {loading ? <span className="notifications-updating" role="status">Actualizando...</span> : null}
      </div>

      {error ? <p className="notifications-error" role="alert">{error}</p> : null}
      {!notifications.data.length ? <div className="notifications-empty"><Bell size={25} aria-hidden="true" /><strong>{filter === "unread" ? "No tienes notificaciones pendientes." : "Todavía no tienes notificaciones."}</strong></div> : <ul className="notifications-list">{notifications.data.map((notification) => {
        const presentation = notificationPresentation(notification.type);
        const Icon = presentation.icon;
        const candidateAction = notificationReferenceAction(notification.reference_type);
        const action = candidateAction && hasPermission(candidateAction.permission) ? candidateAction : null;
        const details = notificationDetails(notification);
        const unread = notification.read_at === null;
        const marking = markingIds.has(notification.id);
        return <li className={`notification-card notification-card--${notification.severity} ${unread ? "is-unread" : "is-read"}`} key={notification.id}>
          <div className="notification-card__icon"><Icon size={20} aria-hidden="true" /></div>
          <div className="notification-card__content"><div className="notification-card__meta"><span>{presentation.label}</span><time dateTime={notification.created_at}>{formatNotificationDate(notification.created_at)}</time>{unread ? <strong>· No leída</strong> : <span>· Leída</span>}</div><h3>{notification.title}</h3><p>{notification.message}</p>{details.length ? <ul className="notification-card__details" aria-label="Datos relacionados">{details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}</div>
          <div className="notification-card__actions">{unread && canUpdate ? <button type="button" disabled={marking} onClick={() => void markOne(notification)}>{marking ? "Marcando..." : "Marcar como leída"}</button> : null}{action ? <button type="button" className="is-primary" onClick={() => void navigate(notification, action.href)}>{action.label}</button> : null}</div>
        </li>;
      })}</ul>}

      {notifications.last_page > 1 ? <nav className="notifications-pagination" aria-label="Paginación de notificaciones"><button type="button" disabled={loading || notifications.current_page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</button><span>Página {notifications.current_page} de {notifications.last_page}</span><button type="button" disabled={loading || notifications.current_page >= notifications.last_page} onClick={() => setPage((current) => current + 1)}>Siguiente</button></nav> : null}
    </section>
  );
};
