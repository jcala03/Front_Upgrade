import { Layout } from "./components/layout/Layout";
import { Atelier } from "./components/sections/Atelier";
import { Contact } from "./components/sections/Contact";
import { FeaturedProducts } from "./components/sections/FeaturedProducts";
import { Hero } from "./components/sections/Hero";
import { Transformation } from "./components/sections/Transformation";
import { SplashScreen } from "./components/ui/SplashScreen";
import { CartProvider } from "./context/CartContext";
import { useSplash } from "./hooks/useSplash";
import { AdminInventoryPage } from "./modules/admin/inventory";
import { AdminDashboardPage } from "./modules/admin/dashboard";
import { AdminCustomersPage } from "./modules/admin/customers";
import { AdminAppointmentsPage } from "./modules/admin/appointments";
import { AdminNotificationsPage } from "./modules/admin/notifications";
import { AdminOrdersPage } from "./modules/admin/orders";
import { AdminQuotationsPage } from "./modules/admin/quotations";
import { AdminReportsPage } from "./modules/admin/reports";
import { AdminProductsPage } from "./modules/admin/products/AdminProductsPage";
import { AdminSettingsPage, ProfilePage } from "./modules/admin/settings";
import { AdminServicesPage } from "./modules/admin/services";
import { AdminEmployeesPage } from "./modules/admin/employees";
import { AdminBranchesPage } from "./modules/admin/branches";
import { AdminCategoriesPage } from "./modules/admin/categories";
import { AdminReferencesPage } from "./modules/admin/references";
import { LoginPage } from "./modules/crm/auth/LoginPage";
import { CrmLayout } from "./modules/crm/layout";
import { UserHomePage } from "./modules/crm/home";
import {
  CrmRouteFallback,
  lazyNamed,
  matchesCrmRoute,
  type CrmRouteDefinition,
} from "./modules/crm/routing";
import { CartPage } from "./pages/Cart";
import { CheckoutPage } from "./pages/Checkout";
import { OrderConfirmationPage } from "./pages/OrderConfirmation";
import { PaymentReturnPage } from "./pages/PaymentReturn";
import { ProductDetailPage } from "./pages/ProductDetail";
import { ShopPage } from "./pages/Shop";
import { getAuthUser, hasPermission } from "./utils/authStorage";
import { Suspense, useEffect, type ReactNode } from "react";

const LazyAdminSchedulesPage = lazyNamed(
  () => import("./modules/admin/schedules"),
  "AdminSchedulesPage",
);
const LazyAdminLeavesPage = lazyNamed(
  () => import("./modules/admin/leaves"),
  "AdminLeavesPage",
);
const LazyAdminTasksPage = lazyNamed(
  () => import("./modules/admin/tasks"),
  "AdminTasksPage",
);
const LazyAdminCalendarPage = lazyNamed(
  () => import("./modules/admin/calendar"),
  "AdminCalendarPage",
);
const LazyAdminGoalsPage = lazyNamed(
  () => import("./modules/admin/goals"),
  "AdminGoalsPage",
);
const LazyMyTasksPage = lazyNamed(
  () => import("./modules/crm/my-tasks"),
  "MyTasksPage",
);
const LazyMyCalendarPage = lazyNamed(
  () => import("./modules/crm/my-calendar"),
  "MyCalendarPage",
);
const LazyMyGoalsPage = lazyNamed(
  () => import("./modules/crm/my-goals"),
  "MyGoalsPage",
);
const LazyMyQuotationsPage = lazyNamed(
  () => import("./modules/crm/my-commerce"),
  "MyQuotationsPage",
);
const LazyMySalesPage = lazyNamed(
  () => import("./modules/crm/my-commerce"),
  "MySalesPage",
);
const LazyAdminCommissionsPage = lazyNamed(
  () => import("./modules/admin/commissions"),
  "AdminCommissionsPage",
);
const LazyMyCommissionsPage = lazyNamed(
  () => import("./modules/crm/my-commissions"),
  "MyCommissionsPage",
);
const LazyMyBusinessOverviewPage = lazyNamed(
  () => import("./modules/crm/business-overview"),
  "MyBusinessOverviewPage",
);

const schedulesRoute = {
  paths: ["/crm/schedules", "/admin/schedules"],
  title: "Horarios",
  description: "Configura jornadas habituales y excepciones por empleado.",
  permission: "employee_schedules.view",
  audience: "admin",
} satisfies CrmRouteDefinition;

const leavesRoute = {
  paths: ["/crm/leaves", "/admin/leaves"],
  title: "Ausencias",
  description: "Registra y consulta ausencias aprobadas del equipo.",
  permission: "employee_leaves.view",
  audience: "admin",
} satisfies CrmRouteDefinition;

const tasksRoute = {
  paths: ["/crm/tasks", "/admin/tasks"],
  title: "Tareas",
  description: "Asigna, programa y da seguimiento al trabajo operativo del equipo.",
  permission: "tasks.view",
  audience: "admin",
} satisfies CrmRouteDefinition;

const appointmentsRoute = {
  paths: ["/crm/appointments", "/admin/appointments"],
  title: "Citas",
  description: "Programa y administra citas operativas con sede histórica.",
  permission: "appointments.view",
  audience: "admin",
} satisfies CrmRouteDefinition;

const calendarRoute = {
  paths: ["/crm/calendar", "/admin/calendar"],
  title: "Calendario",
  description: "Consulta citas, tareas, ausencias y horarios con semántica multisede.",
  permission: "calendar.view",
  audience: "admin",
} satisfies CrmRouteDefinition;

const goalsRoute = {
  paths: ["/crm/goals", "/admin/goals"],
  title: "Metas",
  description: "Gestiona metas manuales por empleado.",
  permission: "goals.view",
  audience: "admin",
} satisfies CrmRouteDefinition;

const myTasksRoute = {
  paths: ["/crm/me/tasks"],
  title: "Mis tareas",
  description: "Consulta y actualiza las tareas asignadas a tu perfil operativo.",
  audience: "user",
} satisfies CrmRouteDefinition;

const myCalendarRoute = {
  paths: ["/crm/me/calendar"],
  title: "Mi calendario",
  description: "Consulta tus citas, tareas, ausencias y horarios personales.",
  audience: "user",
} satisfies CrmRouteDefinition;

const myGoalsRoute = {
  paths: ["/crm/me/goals"],
  title: "Mis metas",
  description: "Consulta y actualiza tus metas manuales.",
  audience: "user",
} satisfies CrmRouteDefinition;

const myBusinessOverviewRoute = {
  paths: ["/crm/me/business-overview"],
  title: "Resumen del negocio",
  description: "Consulta tu contexto comercial personal por compañía, sede actual y desempeño.",
  permission: "business_overview.view",
  audience: "user",
} satisfies CrmRouteDefinition;

const myQuotationsRoute = {
  paths: ["/crm/me/quotations"],
  title: "Mis cotizaciones",
  description: "Crea y gestiona las cotizaciones asignadas a tu perfil comercial.",
  permission: "quotations.view_own",
  audience: "user",
} satisfies CrmRouteDefinition;

const mySalesRoute = {
  paths: ["/crm/me/sales"],
  title: "Mis ventas",
  description: "Consulta y gestiona las ventas asignadas a tu perfil comercial.",
  permission: "orders.view_own",
  audience: "user",
} satisfies CrmRouteDefinition;

const commissionsRoute = {
  paths: ["/crm/commissions", "/admin/commissions"],
  title: "Comisiones",
  description: "Consulta el historial trazable de comisiones comerciales.",
  permission: "commissions.view",
  audience: "admin",
} satisfies CrmRouteDefinition;

const myCommissionsRoute = {
  paths: ["/crm/me/commissions"],
  title: "Mis comisiones",
  description: "Consulta tus comisiones y el resumen del mes actual.",
  permission: "commissions.view_own",
  audience: "user",
} satisfies CrmRouteDefinition;

type PrivatePageProps = {
  children: ReactNode;
  title: string;
  description?: string;
  permission?: string;
};

const PrivateState = ({
  title,
  message,
  actionHref = "/crm",
  actionLabel = "Volver al Dashboard",
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) => (
  <section className="crm-private-state" role="alert" aria-labelledby="crm-private-state-title">
    <span>CRM privado</span>
    <h2 id="crm-private-state-title">{title}</h2>
    <p>{message}</p>
    <a href={actionHref}>{actionLabel}</a>
  </section>
);

const PrivatePage = ({ children, title, description, permission }: PrivatePageProps) => {
  if (!getAuthUser()) {
    window.location.replace("/login");
    return null;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <CrmLayout title="Acceso denegado">
        <PrivateState
          title="No tienes acceso a esta sección"
          message="Tu cuenta no posee el permiso necesario para consultar este módulo."
        />
      </CrmLayout>
    );
  }

  return (
    <CrmLayout title={title} description={description}>
      {children}
    </CrmLayout>
  );
};

const AppContent = () => {
  const { isSplashVisible, completeSplash } = useSplash();
  const pathname = window.location.pathname.replace(/\/$/, "") || "/";

  useEffect(() => {
    const isPrivateRoute = pathname === "/crm" || pathname.startsWith("/crm/") || pathname === "/admin" || pathname.startsWith("/admin/");
    if (!isPrivateRoute) return;

    const previousTitle = document.title;
    const existingRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobotsContent = existingRobots?.content;
    const robots = existingRobots ?? document.createElement("meta");

    if (!existingRobots) {
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";

    if (["/crm/me", "/admin/me"].includes(pathname) || (["/crm", "/admin"].includes(pathname) && getAuthUser()?.role === "user")) {
      document.title = "Inicio | Upgrade La 79";
    } else if (["/crm", "/admin", "/crm/dashboard", "/admin/dashboard"].includes(pathname)) {
      document.title = "Dashboard | Upgrade La 79";
    } else if (pathname === "/crm/orders" || pathname === "/admin/orders") {
      document.title = "Órdenes y ventas | Upgrade La 79";
    } else if (pathname === "/crm/customers" || pathname === "/admin/customers") {
      document.title = "Clientes | Upgrade La 79";
    } else if (pathname === "/crm/quotations" || pathname === "/admin/quotations") {
      document.title = "Cotizaciones | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, appointmentsRoute)) {
      document.title = "Citas | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, calendarRoute)) {
      document.title = "Calendario | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, goalsRoute)) {
      document.title = "Metas | Upgrade La 79";
    } else if (pathname === "/crm/notifications" || pathname === "/admin/notifications") {
      document.title = "Notificaciones | Upgrade La 79";
    } else if (pathname === "/crm/reports" || pathname === "/admin/reports") {
      document.title = "Reportes | Upgrade La 79";
    } else if (pathname === "/crm/services" || pathname === "/admin/services") {
      document.title = "Servicios | Upgrade La 79";
    } else if (pathname === "/crm/employees" || pathname === "/admin/employees") {
      document.title = "Empleados | Upgrade La 79";
    } else if (pathname === "/crm/branches" || pathname === "/admin/branches") {
      document.title = "Sedes | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, schedulesRoute)) {
      document.title = "Horarios | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, leavesRoute)) {
      document.title = "Ausencias | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, tasksRoute)) {
      document.title = "Tareas | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, myTasksRoute)) {
      document.title = "Mis tareas | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, myCalendarRoute)) {
      document.title = "Mi calendario | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, myGoalsRoute)) {
      document.title = "Mis metas | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, myBusinessOverviewRoute)) {
      document.title = "Resumen del negocio | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, myQuotationsRoute)) {
      document.title = "Mis cotizaciones | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, mySalesRoute)) {
      document.title = "Mis ventas | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, commissionsRoute)) {
      document.title = "Comisiones | Upgrade La 79";
    } else if (matchesCrmRoute(pathname, myCommissionsRoute)) {
      document.title = "Mis comisiones | Upgrade La 79";
    } else if (["/crm/inventory", "/admin/inventory"].includes(pathname)) {
      document.title = "Existencias | Upgrade La 79";
    } else if (["/crm/inventory/movements", "/admin/inventory/movements"].includes(pathname)) {
      document.title = "Movimientos de inventario | Upgrade La 79";
    } else if (["/crm/inventory/transfers", "/admin/inventory/transfers"].includes(pathname)) {
      document.title = "Transferencias | Upgrade La 79";
    } else if (
      pathname === "/crm/settings/categories" ||
      pathname === "/crm/categories" ||
      pathname === "/admin/categories" ||
      pathname === "/admin/product-categories"
    ) {
      document.title = "Categorías | Upgrade La 79";
    } else if (
      pathname === "/crm/settings/brands" ||
      pathname === "/crm/settings/product-brands" ||
      pathname === "/crm/settings/compatibility" ||
      pathname === "/crm/references" ||
      pathname === "/admin/references"
    ) {
      document.title = "Referencias | Upgrade La 79";
    } else if (["/crm/products", "/crm/catalog", "/admin/products"].includes(pathname)) {
      document.title = "Catálogo | Upgrade La 79";
    } else if (pathname === "/crm/settings" || pathname === "/admin/settings") {
      document.title = "Configuración | Upgrade La 79";
    } else if (pathname === "/crm/profile" || pathname === "/admin/profile") {
      document.title = "Mi perfil | Upgrade La 79";
    } else {
      document.title = "Página no encontrada | Upgrade La 79";
    }

    return () => {
      document.title = previousTitle;
      if (existingRobots) {
        existingRobots.content = previousRobotsContent ?? "";
      } else {
        robots.remove();
      }
    };
  }, [pathname]);

  if (pathname === "/login") {
    return <LoginPage />;
  }

  if (["/crm", "/admin"].includes(pathname) && getAuthUser()?.role === "user") {
    return (
      <PrivatePage title="Inicio" description="Tu espacio operativo personal en el CRM.">
        <UserHomePage />
      </PrivatePage>
    );
  }

  if (pathname === "/crm/me" || pathname === "/admin/me") {
    return (
      <PrivatePage title="Inicio" description="Tu espacio operativo personal en el CRM.">
        <UserHomePage />
      </PrivatePage>
    );
  }

  if (["/crm", "/admin", "/crm/dashboard", "/admin/dashboard"].includes(pathname)) {
    return (
      <PrivatePage title="Dashboard" description="Resumen general y operativo del negocio." permission="dashboard.view">
        <AdminDashboardPage />
      </PrivatePage>
    );
  }

  if (pathname === "/crm/inventory" || pathname === "/admin/inventory") {
    return (
      <PrivatePage
        title="Inventario"
        description="Consulta y administra existencias reales por sede."
        permission="inventory.view"
      >
        <AdminInventoryPage />
      </PrivatePage>
    );
  }

  if (pathname === "/crm/inventory/movements" || pathname === "/admin/inventory/movements") {
    return <PrivatePage title="Movimientos de inventario" description="Trazabilidad operativa por sede." permission="inventory.view"><AdminInventoryPage view="movements" /></PrivatePage>;
  }

  if (pathname === "/crm/inventory/transfers" || pathname === "/admin/inventory/transfers") {
    return <PrivatePage title="Transferencias" description="Traslados de inventario entre sedes." permission="inventory_transfers.view"><AdminInventoryPage view="transfers" /></PrivatePage>;
  }

  if (pathname === "/crm/settings" || pathname === "/admin/settings") {
    return <PrivatePage title="Configuración" description="Administra la información del negocio, reglas comerciales y usuarios del CRM." permission="settings.view"><AdminSettingsPage /></PrivatePage>;
  }

  if (pathname === "/crm/profile" || pathname === "/admin/profile") {
    return <PrivatePage title="Mi perfil" description="Gestiona tus datos personales y la seguridad de tu cuenta."><ProfilePage /></PrivatePage>;
  }

  if (
    pathname === "/crm/settings/categories" ||
    pathname === "/crm/settings/brands" ||
    pathname === "/crm/settings/product-brands" ||
    pathname === "/crm/settings/compatibility" ||
    pathname === "/crm/categories" ||
    pathname === "/crm/references" ||
    pathname === "/admin/categories" ||
    pathname === "/admin/product-categories" ||
    pathname === "/admin/references"
  ) {
    const isCategory = pathname.includes("categories") || pathname.includes("product-categories");
    const referenceScope = pathname.includes("brands") ? "product_brands" : pathname.includes("compatibility") ? "vehicle_compatibility" : "all";
    return (
      <PrivatePage
        title={isCategory ? "Categorías" : "Referencias"}
        description="Administra datos auxiliares del catálogo y la compatibilidad vehicular."
        permission="products.view"
      >
        {isCategory ? <AdminCategoriesPage /> : <AdminReferencesPage scope={referenceScope} />}
      </PrivatePage>
    );
  }

  if (pathname === "/crm/notifications" || pathname === "/admin/notifications") {
    return (
      <PrivatePage
        title="Notificaciones"
        description="Consulta alertas internas sobre órdenes, pagos, inventario, tareas y eventos importantes."
        permission="notifications.view"
      >
        <AdminNotificationsPage />
      </PrivatePage>
    );
  }

  if (pathname === "/crm/reports" || pathname === "/admin/reports") {
    return <PrivatePage title="Reportes" description="Consulta y analiza la operación por periodos." permission="reports.view"><AdminReportsPage /></PrivatePage>;
  }

  if (pathname === "/crm/services" || pathname === "/admin/services") {
    return <PrivatePage title="Servicios" description="Administra servicios no inventariables para ventas y cotizaciones." permission="services.view"><AdminServicesPage /></PrivatePage>;
  }

  if (pathname === "/crm/employees" || pathname === "/admin/employees") {
    return <PrivatePage title="Empleados" description="Administra colaboradores operativos, cargos y vínculos opcionales de acceso CRM." permission="employees.view"><AdminEmployeesPage /></PrivatePage>;
  }

  if (pathname === "/crm/branches" || pathname === "/admin/branches") {
    return <PrivatePage title="Sedes" description="Administra ubicaciones operativas y su disponibilidad en el CRM." permission="branches.view"><AdminBranchesPage /></PrivatePage>;
  }

  if (matchesCrmRoute(pathname, schedulesRoute)) {
    return (
      <PrivatePage
        title={schedulesRoute.title}
        description={schedulesRoute.description}
        permission={schedulesRoute.permission}
      >
        <Suspense fallback={<CrmRouteFallback />}>
          <LazyAdminSchedulesPage />
        </Suspense>
      </PrivatePage>
    );
  }

  if (matchesCrmRoute(pathname, leavesRoute)) {
    return (
      <PrivatePage
        title={leavesRoute.title}
        description={leavesRoute.description}
        permission={leavesRoute.permission}
      >
        <Suspense fallback={<CrmRouteFallback />}>
          <LazyAdminLeavesPage />
        </Suspense>
      </PrivatePage>
    );
  }

  if (matchesCrmRoute(pathname, tasksRoute)) {
    return (
      <PrivatePage
        title={tasksRoute.title}
        description={tasksRoute.description}
        permission={tasksRoute.permission}
      >
        <Suspense fallback={<CrmRouteFallback />}>
          <LazyAdminTasksPage />
        </Suspense>
      </PrivatePage>
    );
  }

  if (matchesCrmRoute(pathname, appointmentsRoute)) {
    return <PrivatePage title={appointmentsRoute.title} description={appointmentsRoute.description} permission={appointmentsRoute.permission}><AdminAppointmentsPage /></PrivatePage>;
  }

  if (matchesCrmRoute(pathname, calendarRoute)) {
    return <PrivatePage title={calendarRoute.title} description={calendarRoute.description} permission={calendarRoute.permission}><Suspense fallback={<CrmRouteFallback />}><LazyAdminCalendarPage /></Suspense></PrivatePage>;
  }

  if (matchesCrmRoute(pathname, goalsRoute)) {
    return <PrivatePage title={goalsRoute.title} description={goalsRoute.description} permission={goalsRoute.permission}><Suspense fallback={<CrmRouteFallback />}><LazyAdminGoalsPage /></Suspense></PrivatePage>;
  }

  if (matchesCrmRoute(pathname, myTasksRoute)) {
    return (
      <PrivatePage title={myTasksRoute.title} description={myTasksRoute.description}>
        <Suspense fallback={<CrmRouteFallback />}>
          <LazyMyTasksPage />
        </Suspense>
      </PrivatePage>
    );
  }

  if (matchesCrmRoute(pathname, myCalendarRoute)) {
    return (
      <PrivatePage title={myCalendarRoute.title} description={myCalendarRoute.description}>
        <Suspense fallback={<CrmRouteFallback />}>
          <LazyMyCalendarPage />
        </Suspense>
      </PrivatePage>
    );
  }

  if (matchesCrmRoute(pathname, myGoalsRoute)) {
    return (
      <PrivatePage title={myGoalsRoute.title} description={myGoalsRoute.description}>
        <Suspense fallback={<CrmRouteFallback />}>
          <LazyMyGoalsPage />
        </Suspense>
      </PrivatePage>
    );
  }

  if (matchesCrmRoute(pathname, myBusinessOverviewRoute)) {
    return (
      <PrivatePage
        title={myBusinessOverviewRoute.title}
        description={myBusinessOverviewRoute.description}
        permission={myBusinessOverviewRoute.permission}
      >
        <Suspense fallback={<CrmRouteFallback />}>
          <LazyMyBusinessOverviewPage />
        </Suspense>
      </PrivatePage>
    );
  }

  if (matchesCrmRoute(pathname, myQuotationsRoute)) {
    return <PrivatePage title={myQuotationsRoute.title} description={myQuotationsRoute.description} permission={myQuotationsRoute.permission}><Suspense fallback={<CrmRouteFallback />}><LazyMyQuotationsPage /></Suspense></PrivatePage>;
  }

  if (matchesCrmRoute(pathname, mySalesRoute)) {
    return <PrivatePage title={mySalesRoute.title} description={mySalesRoute.description} permission={mySalesRoute.permission}><Suspense fallback={<CrmRouteFallback />}><LazyMySalesPage /></Suspense></PrivatePage>;
  }

  if (matchesCrmRoute(pathname, commissionsRoute)) {
    return <PrivatePage title={commissionsRoute.title} description={commissionsRoute.description} permission={commissionsRoute.permission}><Suspense fallback={<CrmRouteFallback />}><LazyAdminCommissionsPage /></Suspense></PrivatePage>;
  }

  if (matchesCrmRoute(pathname, myCommissionsRoute)) {
    return <PrivatePage title={myCommissionsRoute.title} description={myCommissionsRoute.description} permission={myCommissionsRoute.permission}><Suspense fallback={<CrmRouteFallback />}><LazyMyCommissionsPage /></Suspense></PrivatePage>;
  }

  if (pathname === "/crm/customers" || pathname === "/admin/customers") {
    return (
      <PrivatePage
        title="Clientes"
        description="Administra perfiles comerciales, vehículos e historial de compras."
        permission="customers.view"
      >
        <AdminCustomersPage />
      </PrivatePage>
    );
  }

  if (pathname === "/crm/orders" || pathname === "/admin/orders") {
    return (
      <PrivatePage
        title="Órdenes web"
        description="Revisa las órdenes creadas desde el checkout, los datos del cliente y el estado de pago."
        permission="orders.view"
      >
        <AdminOrdersPage />
      </PrivatePage>
    );
  }

  if (pathname === "/crm/quotations" || pathname === "/admin/quotations") {
    return <PrivatePage title="Cotizaciones" description="Crea, consulta y convierte propuestas comerciales en ventas." permission="quotations.view"><AdminQuotationsPage /></PrivatePage>;
  }

  if (
    pathname === "/crm/products" ||
    pathname === "/crm/catalog" ||
    pathname === "/admin/products"
  ) {
    return (
      <PrivatePage
        title="Catálogo publicado"
        description="Revisa qué artículos aparecen en el ecommerce, cuáles están ocultos y cuáles están destacados."
        permission="products.view"
      >
        <AdminProductsPage />
      </PrivatePage>
    );
  }

  if (pathname === "/tienda") {
    return (
      <Layout>
        <ShopPage />
      </Layout>
    );
  }

  if (pathname.startsWith("/tienda/")) {
    const slug = pathname.replace("/tienda/", "").split("/")[0];

    return (
      <Layout>
        <ProductDetailPage slug={slug} />
      </Layout>
    );
  }

  if (pathname === "/carrito") {
    return (
      <Layout>
        <CartPage />
      </Layout>
    );
  }

  if (pathname === "/checkout") {
    return (
      <Layout>
        <CheckoutPage />
      </Layout>
    );
  }

  if (pathname === "/orden-confirmada") {
    return (
      <Layout>
        <OrderConfirmationPage />
      </Layout>
    );
  }

  if (pathname === "/checkout/payment/return") {
    return (
      <Layout>
        <PaymentReturnPage />
      </Layout>
    );
  }

  if (pathname === "/crm" || pathname.startsWith("/crm/") || pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <PrivatePage title="Página no encontrada">
        <PrivateState
          title="Página no encontrada"
          message="La dirección solicitada no corresponde a una sección disponible del CRM."
        />
      </PrivatePage>
    );
  }

  return (
    <>
      {isSplashVisible ? <SplashScreen onComplete={completeSplash} /> : null}

      <Layout>
        <main>
          <Hero />
          <Transformation />
          <FeaturedProducts />
          <Atelier />
          <Contact />
        </main>
      </Layout>
    </>
  );
};

const App = () => {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
};

export default App;
