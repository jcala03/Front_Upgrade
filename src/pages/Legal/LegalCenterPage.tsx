import { LEGAL_ROUTES, legalIdentity, OFFICIAL_EMAIL } from "../../privacy/config";
import { openPrivacyPreferences } from "../../privacy/consent";
import dataPolicy from "../../../docs/legal/politica-de-datos.md?raw";
import cookiePolicy from "../../../docs/legal/politica-de-cookies.md?raw";
import terms from "../../../docs/legal/terminos-y-condiciones.md?raw";
import shipping from "../../../docs/legal/envios-y-entregas.md?raw";
import warranties from "../../../docs/legal/cambios-devoluciones-y-garantias.md?raw";
import privacyCenter from "../../../docs/legal/centro-de-privacidad.md?raw";
import "./LegalCenterPage.css";

export const legalDocuments: Record<string, string> = { "politica-de-datos": dataPolicy, "politica-de-cookies": cookiePolicy, "terminos-y-condiciones": terms, "envios-y-entregas": shipping, "cambios-devoluciones-y-garantias": warranties, "centro-de-privacidad": privacyCenter };
const identityFields = () => ({ ...legalIdentity,
  responsibleIdentity: `${legalIdentity.holderName}, persona natural titular del establecimiento de comercio ${legalIdentity.legalName}`,
  taxIdDisplay: legalIdentity.taxIdVerified ? `${legalIdentity.taxIdType} ${legalIdentity.taxId}` : `${legalIdentity.taxId} (tipo de identificación pendiente de confirmar)`,
});
export const interpolateLegal = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_, key: keyof ReturnType<typeof identityFields>) => String(identityFields()[key] ?? "Dato pendiente de aprobación"));
export const parseLegalDocument = (text: string) => {
  const blocks: { kind: "title" | "heading" | "paragraph"; text: string }[] = [];
  let paragraph: string[] = [];
  const flush = () => { if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") }); paragraph = []; };
  for (const line of interpolateLegal(text).trim().split(/\r?\n/)) {
    const heading = /^(#{1,2})\s+(.+)$/.exec(line);
    if (heading) { flush(); blocks.push({ kind: heading[1].length === 1 ? "title" : "heading", text: heading[2] }); }
    else if (!line.trim()) flush();
    else paragraph.push(line.trim());
  }
  flush(); return blocks;
};
function Text({ text }: { text: string }) {
  return <>{text.split(/(https:\/\/www\.sic\.gov\.co\/|jcano@upgradecolombia\.com)/g).map((part, i) => part === OFFICIAL_EMAIL ? <a key={i} href={`mailto:${OFFICIAL_EMAIL}`}>{part}</a> : part === "https://www.sic.gov.co/" ? <a key={i} href={part} target="_blank" rel="noreferrer">Superintendencia de Industria y Comercio</a> : part)}</>;
}
const storageInventory = [
  ["Oswald · /fonts/oswald/", "Archivos locales · mismo origen", "Presentación tipográfica, independiente de GA4", "Según caché HTTP del recurso; no es una cookie analítica"],
  ["upgrade79_cart", "localStorage · UP GRADE 79", "Carrito necesario", "Hasta borrarlo; sin caducidad programada"],
  ["upgrade79_*checkout*, upgrade79_last_order, upgrade79_payment_*, upgrade79_paid_cart_reconciled:*", "sessionStorage · UP GRADE 79", "Continuidad, idempotencia y estado del pedido", "Sesión de la pestaña; algunas claves se eliminan al terminar el flujo"],
  ["upgrade79_crm_user, upgrade79_auth_notice, scroll del CRM", "sessionStorage · UP GRADE 79", "Acceso interno y navegación", "Sesión de la pestaña o cierre de sesión según la clave"],
  ["upgrade79_privacy_choice", "localStorage · UP GRADE 79", "Preferencia necesaria de privacidad", "180 días; versión y fecha verificadas al leer"],
  ["upgrade79_ga4_purchases", "localStorage · UP GRADE 79", "Analítica opcional: evitar compras duplicadas", "Últimos 500 identificadores; se elimina al retirar el consentimiento o borrar almacenamiento"],
  ["upgrade79-push-device, upgrade79-push-diagnostics", "IndexedDB · UP GRADE 79", "Dispositivo Push y diagnóstico", "Según limpieza del dispositivo y límites del diagnóstico; no es una cookie GA"],
  ["Shell offline e iconos", "Cache Storage · Service Worker", "PWA esencial; no respuestas privadas", "Según actualización/limpieza de la PWA"],
];

export default function LegalCenterPage({ slug, review }: { slug: string; review: boolean }) {
  const href = (key: string) => `${review ? "/__legal-review" : ""}/${key}`;
  const blocks = legalDocuments[slug] ? parseLegalDocument(legalDocuments[slug]) : [];
  const title = blocks.find(block => block.kind === "title")?.text ?? "Legal y privacidad";
  return <main className="legal-center container-wide">
    <nav className="legal-center__breadcrumb" aria-label="Ruta legal"><a href="/">Inicio</a><a href={href("legal-y-privacidad")}>Legal y privacidad</a></nav>
    {review ? <aside className="legal-center__review" role="note">Revisión local editorial y jurídica. Estos documentos no sustituyen todavía las páginas publicadas.</aside> : null}
    <header><span>UP GRADE 79 · Información y atención</span><h1>{title}</h1><p>{legalIdentity.reviewed && legalIdentity.effectiveDate ? <>Vigencia: <time dateTime={legalIdentity.effectiveDate}>{legalIdentity.effectiveDate}</time></> : "Borrador local · Vigencia pendiente de aprobación"} · Contacto: <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a></p></header>
    <div className="legal-center__layout">
      <nav className="legal-center__documents" aria-label="Documentos legales">{LEGAL_ROUTES.map(([key, label]) => <a href={href(key)} key={key} aria-current={slug === key ? "page" : undefined}>{label}</a>)}<button type="button" onClick={openPrivacyPreferences}>Configuración de cookies</button><a href="https://www.sic.gov.co/" target="_blank" rel="noreferrer">Superintendencia de Industria y Comercio</a></nav>
      <article className="legal-center__article">
        {blocks.length ? <>
          <nav className="legal-center__toc" aria-label="Índice del documento"><h2>En este documento</h2><ol>{blocks.map((block, index) => block.kind === "heading" ? <li key={index}><a href={`#apartado-${index}`}>{block.text}</a></li> : null)}</ol></nav>
          {blocks.map((block, index) => block.kind === "title" ? null : block.kind === "heading" ? <h2 key={index} id={`apartado-${index}`}>{block.text}</h2> : <p key={index}><Text text={block.text} /></p>)}
        </> : <><h2>Información clara para decidir</h2><p>Consulta el tratamiento de tus datos, las condiciones comerciales y los canales para ejercer tus derechos.</p><p><strong>{legalIdentity.holderName}</strong>, persona natural titular del establecimiento de comercio {legalIdentity.legalName}. Identificación: {identityFields().taxIdDisplay}. Atención: {legalIdentity.address}, {legalIdentity.city}.</p><div className="legal-center__cards">{LEGAL_ROUTES.map(([key, label]) => <a href={href(key)} key={key}><h3>{label}</h3><span>Consultar documento →</span></a>)}</div></>}
        {slug === "politica-de-cookies" ? <section><h2>Inventario de tecnologías del sitio</h2><p>Inventario de código y observación anónima. No se han constatado cookies GA instaladas. Las cookies de sesión/CSRF y su duración efectiva requieren comprobación en un acceso autenticado autorizado; no se sustituyen por los valores por defecto de Laravel.</p><div className="legal-center__inventory">{storageInventory.map(([name, owner, purpose, duration]) => <dl key={name}><dt>Identificador</dt><dd>{name}</dd><dt>Medio y proveedor</dt><dd>{owner}</dd><dt>Finalidad y categoría</dt><dd>{purpose}</dd><dt>Duración</dt><dd>{duration}</dd></dl>)}</div><p>GA4 opcional, no instalado por defecto: _ga y _ga_ del flujo real. La integración preparada fija cookie_expires en 15.552.000 segundos (180 días) y cookie_update en false; la tabla definitiva exige comprobación con el flujo real antes de activarlo.</p></section> : null}
        {slug === "centro-de-privacidad" ? <button className="legal-center__button" type="button" onClick={openPrivacyPreferences}>Configuración de cookies</button> : null}
        <footer><p>Atención: <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a></p><a href={href("legal-y-privacidad")}>Volver al centro legal</a> · <a href="/tienda">Volver a la tienda</a></footer>
      </article>
    </div>
  </main>;
}
