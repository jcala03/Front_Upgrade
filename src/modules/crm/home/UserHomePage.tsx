import { BadgeDollarSign, Bell, FileText, ShoppingBag, UserRound } from "lucide-react";
import { getAuthUser, hasPermission } from "../../../utils/authStorage";
import "./UserHomePage.css";

export const UserHomePage = () => {
  const user = getAuthUser();

  return (
    <section className="user-home" aria-labelledby="user-home-title">
      <header className="user-home__welcome">
        <span>Espacio personal</span>
        <h2 id="user-home-title">Hola, {user?.name ?? "Usuario"}</h2>
        <p>Desde aquí puedes consultar tus novedades y gestionar la información de tu cuenta.</p>
      </header>

      <nav className="user-home__links" aria-label="Accesos de mi espacio">
        {hasPermission("quotations.view_own") ? <a href="/crm/me/quotations">
          <FileText size={22} aria-hidden="true" />
          <span><strong>Mis cotizaciones</strong><small>Crea y gestiona tus propuestas comerciales.</small></span>
        </a> : null}
        {hasPermission("orders.view_own") ? <a href="/crm/me/sales">
          <ShoppingBag size={22} aria-hidden="true" />
          <span><strong>Mis ventas</strong><small>Consulta, confirma y completa tus ventas propias.</small></span>
        </a> : null}
        {hasPermission("commissions.view_own") ? <a href="/crm/me/commissions">
          <BadgeDollarSign size={22} aria-hidden="true" />
          <span><strong>Mis comisiones</strong><small>Consulta tus comisiones reales y el resumen del mes.</small></span>
        </a> : null}
        {hasPermission("notifications.view") ? <a href="/crm/notifications">
          <Bell size={22} aria-hidden="true" />
          <span><strong>Mis notificaciones</strong><small>Consulta alertas y eventos importantes para ti.</small></span>
        </a> : null}
        <a href="/crm/profile">
          <UserRound size={22} aria-hidden="true" />
          <span><strong>Mi perfil</strong><small>Actualiza tus datos de acceso y contraseña.</small></span>
        </a>
      </nav>

      <p className="user-home__future">Tus demás herramientas operativas aparecerán aquí cuando estén disponibles.</p>
    </section>
  );
};
