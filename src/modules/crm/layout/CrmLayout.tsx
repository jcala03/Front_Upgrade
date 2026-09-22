import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BadgeDollarSign,
  Bell,
  BriefcaseBusiness,
  Building2,
  Boxes,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  FileText,
  House,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Wrench,
  LogOut,
  Settings,
  ShoppingBag,
  Store,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import logo from "../../../assets/logos/upgrade79-logo.png";
import { logout } from "../../../api/auth";
import { getUnreadNotificationCount, NOTIFICATION_COUNT_EVENT } from "../../../api/notifications";
import { AUTH_USER_EVENT, clearAuthSession, getAuthUser, hasPermission } from "../../../utils/authStorage";
import type { AuthUser } from "../../../types/auth";
import "./CrmLayout.css";

type CrmLayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Boxes;
  matches: string[];
  permission?: string;
};

const operationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/crm",
    icon: LayoutDashboard,
    matches: ["/crm", "/admin", "/crm/dashboard", "/admin/dashboard"],
    permission: "dashboard.view",
  },
  {
    label: "Inventario",
    href: "/crm/inventory",
    icon: Boxes,
    matches: ["/crm/inventory", "/admin/inventory", "/crm/inventory/movements", "/admin/inventory/movements", "/crm/inventory/transfers", "/admin/inventory/transfers"],
    permission: "inventory.view",
  },
  {
    label: "Órdenes",
    href: "/crm/orders",
    icon: ShoppingBag,
    matches: ["/crm/orders", "/admin/orders"],
    permission: "orders.view",
  },
  {
    label: "Clientes",
    href: "/crm/customers",
    icon: UsersRound,
    matches: ["/crm/customers", "/admin/customers"],
    permission: "customers.view",
  },
  {
    label: "Cotizaciones",
    href: "/crm/quotations",
    icon: FileText,
    matches: ["/crm/quotations", "/admin/quotations"],
    permission: "quotations.view",
  },
  {
    label: "Citas",
    href: "/crm/appointments",
    icon: CalendarCheck,
    matches: ["/crm/appointments", "/admin/appointments"],
    permission: "appointments.view",
  },
  {
    label: "Calendario",
    href: "/crm/calendar",
    icon: CalendarDays,
    matches: ["/crm/calendar", "/admin/calendar"],
    permission: "calendar.view",
  },
];

const personalItems: NavigationItem[] = [
  {
    label: "Empleados",
    href: "/crm/employees",
    icon: BriefcaseBusiness,
    matches: ["/crm/employees", "/admin/employees"],
    permission: "employees.view",
  },
  {
    label: "Horarios",
    href: "/crm/schedules",
    icon: CalendarClock,
    matches: ["/crm/schedules", "/admin/schedules"],
    permission: "employee_schedules.view",
  },
  {
    label: "Ausencias",
    href: "/crm/leaves",
    icon: CalendarOff,
    matches: ["/crm/leaves", "/admin/leaves"],
    permission: "employee_leaves.view",
  },
  {
    label: "Tareas",
    href: "/crm/tasks",
    icon: ListTodo,
    matches: ["/crm/tasks", "/admin/tasks"],
    permission: "tasks.view",
  },
  {
    label: "Metas",
    href: "/crm/goals",
    icon: Target,
    matches: ["/crm/goals", "/admin/goals"],
    permission: "goals.view",
  },
];

const catalogItems: NavigationItem[] = [
  {
    label: "Catálogo publicado",
    href: "/crm/catalog",
    icon: Store,
    matches: ["/crm/catalog", "/crm/products", "/admin/products"],
    permission: "products.view",
  },
  {
    label: "Servicios",
    href: "/crm/services",
    icon: Wrench,
    matches: ["/crm/services", "/admin/services"],
    permission: "services.view",
  },
];

const analysisItems: NavigationItem[] = [
  {
    label: "Comisiones",
    href: "/crm/commissions",
    icon: BadgeDollarSign,
    matches: ["/crm/commissions", "/admin/commissions"],
    permission: "commissions.view",
  },
  {
    label: "Reportes",
    href: "/crm/reports",
    icon: LineChart,
    matches: ["/crm/reports", "/admin/reports"],
    permission: "reports.view",
  },
  {
    label: "Notificaciones",
    href: "/crm/notifications",
    icon: Bell,
    matches: ["/crm/notifications", "/admin/notifications"],
    permission: "notifications.view",
  },
];

const administrationItems: NavigationItem[] = [
  {
    label: "Sedes",
    href: "/crm/branches",
    icon: Building2,
    matches: ["/crm/branches", "/admin/branches"],
    permission: "branches.view",
  },
  {
    label: "Configuración",
    href: "/crm/settings",
    icon: Settings,
    matches: [
      "/crm/settings",
      "/admin/settings",
    ],
    permission: "settings.view",
  },
];

const userItems: NavigationItem[] = [
  {
    label: "Inicio",
    href: "/crm/me",
    icon: House,
    matches: ["/crm", "/admin", "/crm/me", "/admin/me"],
  },
  {
    label: "Mi calendario",
    href: "/crm/me/calendar",
    icon: CalendarDays,
    matches: ["/crm/me/calendar"],
  },
  {
    label: "Resumen del negocio",
    href: "/crm/me/business-overview",
    icon: LineChart,
    matches: ["/crm/me/business-overview"],
    permission: "business_overview.view",
  },
  {
    label: "Mis cotizaciones",
    href: "/crm/me/quotations",
    icon: FileText,
    matches: ["/crm/me/quotations"],
    permission: "quotations.view_own",
  },
  {
    label: "Mis ventas",
    href: "/crm/me/sales",
    icon: ShoppingBag,
    matches: ["/crm/me/sales"],
    permission: "orders.view_own",
  },
  {
    label: "Mis comisiones",
    href: "/crm/me/commissions",
    icon: BadgeDollarSign,
    matches: ["/crm/me/commissions"],
    permission: "commissions.view_own",
  },
  {
    label: "Mis tareas",
    href: "/crm/me/tasks",
    icon: ListTodo,
    matches: ["/crm/me/tasks"],
  },
  {
    label: "Mis metas",
    href: "/crm/me/goals",
    icon: Target,
    matches: ["/crm/me/goals"],
  },
  {
    label: "Notificaciones",
    href: "/crm/notifications",
    icon: Bell,
    matches: ["/crm/notifications", "/admin/notifications"],
    permission: "notifications.view",
  },
  {
    label: "Mi perfil",
    href: "/crm/profile",
    icon: UserRound,
    matches: ["/crm/profile", "/admin/profile"],
  },
];

const normalizePathname = (pathname: string) => {
  return pathname.replace(/\/$/, "") || "/";
};

const isNavigationItemActive = (
  pathname: string,
  item: NavigationItem
) => {
  return item.matches.includes(pathname);
};

export const CrmLayout = ({
  children,
  title = "CRM UP GRADE 79",
  description = "Panel interno para administrar inventario, catálogo, órdenes y operación del negocio.",
}: CrmLayoutProps) => {
  const pathname = normalizePathname(window.location.pathname);
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const roleLabel = user?.role === "user" ? "Usuario" : "Administrador";
  const isStandardUser = user?.role === "user";
  const canViewNotifications = hasPermission("notifications.view");
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadRequestId = useRef(0);

  useEffect(() => {
    const updateUser = (event: Event) => setUser((event as CustomEvent<AuthUser | null>).detail);
    window.addEventListener(AUTH_USER_EVENT, updateUser);
    return () => window.removeEventListener(AUTH_USER_EVENT, updateUser);
  }, []);

  useEffect(() => {
    if (!canViewNotifications) {
      setUnreadCount(0);
      return;
    }
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      const request = ++unreadRequestId.current;
      try {
        const count = await getUnreadNotificationCount();
        if (active && request === unreadRequestId.current) setUnreadCount(Math.max(0, count));
      } catch {
        // La página de notificaciones mostrará errores accionables; la campana conserva su último valor fiable.
      }
    };
    const handleVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    const handleCount = (event: Event) => {
      unreadRequestId.current += 1;
      setUnreadCount(Math.max(0, (event as CustomEvent<number>).detail ?? 0));
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60_000);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(NOTIFICATION_COUNT_EVENT, handleCount);
    return () => {
      active = false;
      unreadRequestId.current += 1;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(NOTIFICATION_COUNT_EVENT, handleCount);
    };
  }, [canViewNotifications]);

  const renderNavigationItem = (item: NavigationItem) => {
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }
    const Icon = item.icon;
    const isActive = isNavigationItemActive(pathname, item);

    return (
      <a
        className={
          isActive
            ? "crm-layout__nav-item crm-layout__nav-item--active"
            : "crm-layout__nav-item"
        }
        href={item.href}
        key={item.href}
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
      >
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>{item.label}</span>
      </a>
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthSession();
      window.location.href = "/login";
    }
  };

  return (
    <div className="crm-layout">
      <aside className="crm-layout__sidebar" aria-label="Navegación del CRM">
        <a className="crm-layout__brand" href={isStandardUser ? "/crm/me" : "/crm"}>
          <img src={logo} alt="UP GRADE 79" />

          <span>CRM interno</span>
        </a>

        {isStandardUser ? <nav className="crm-layout__nav crm-layout__user-nav" aria-label="Mi espacio">
          <span className="crm-layout__nav-label">Mi espacio</span>
          {userItems.map(renderNavigationItem)}
        </nav> : <>
          <div className="crm-layout__admin-nav">
            <nav className="crm-layout__nav" aria-label="Operación">
              <span className="crm-layout__nav-label">Operación</span>
              {operationItems.map(renderNavigationItem)}
            </nav>
            <nav className="crm-layout__nav" aria-label="Personal">
              <span className="crm-layout__nav-label">Personal</span>
              {personalItems.map(renderNavigationItem)}
            </nav>
            <nav className="crm-layout__nav" aria-label="Catálogo">
              <span className="crm-layout__nav-label">Catálogo</span>
              {catalogItems.map(renderNavigationItem)}
            </nav>
            <nav className="crm-layout__nav" aria-label="Análisis">
              <span className="crm-layout__nav-label">Análisis</span>
              {analysisItems.map(renderNavigationItem)}
            </nav>
            <nav className="crm-layout__nav" aria-label="Administración">
              <span className="crm-layout__nav-label">Administración</span>
              {administrationItems.map(renderNavigationItem)}
            </nav>
          </div>
        </>}

        <div className="crm-layout__sidebar-footer">
          <span>UP GRADE 79</span>
          <small>Automotive Upgrading</small>
        </div>
      </aside>

      <div className="crm-layout__main">
        <header className="crm-layout__topbar">
          <div>
            <span className="crm-layout__eyebrow">
              {isStandardUser ? "Mi espacio CRM" : "Panel administrativo"}
            </span>

            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="crm-layout__topbar-actions">
            {canViewNotifications ? <a
              className="crm-layout__bell"
              href="/crm/notifications"
              aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones"}
            >
              <Bell size={18} strokeWidth={1.9} aria-hidden="true" />
              {unreadCount > 0 ? <span>{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
            </a> : null}

            <a className="crm-layout__user" href="/crm/profile" aria-label="Abrir Mi perfil">
              <div>
                <UserRound
                  size={17}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </div>

              <span>
                {user?.name || "Usuario"}
                <small>{roleLabel}</small>
              </span>
            </a>

            <button className="crm-layout__logout" type="button" onClick={() => void handleLogout()}>
              <LogOut size={17} strokeWidth={1.9} aria-hidden="true" />
              Salir
            </button>
          </div>
        </header>

        <main className="crm-layout__content">{children}</main>
      </div>
    </div>
  );
};
