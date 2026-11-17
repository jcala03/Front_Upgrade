export const OFFICIAL_EMAIL = "jcano@upgradecolombia.com";
export const PRIVACY_VERSION = "2026-11-09.1";
export const PREFERENCE_DAYS = 180;
// Separate from publishing the complete legal center. Neither gate is enabled
// by URL parameters or a stored cookie choice alone.
export const privacyControlsEnabled = import.meta.env?.DEV || import.meta.env?.VITE_PRIVACY_CONTROLS_ENABLED === "true";
export const analyticsInformationReviewed = import.meta.env?.VITE_ANALYTICS_INFORMATION_REVIEWED === "true";
// Public data confirmed by the owner on 2026-11-09. Do not infer a legal form or NIT type.
export const legalIdentity = {
  legalName: "Light Tunning Store" as string | null,
  holderName: "Juan Cano Jimenez" as string | null,
  taxIdType: null as string | null,
  taxIdVerified: false,
  taxId: "1143149923" as string | null,
  address: "carrera 44 #79-04" as string | null,
  city: "Barranquilla, Colombia",
  phone: "+57 302 388 7034",
  email: OFFICIAL_EMAIL,
  effectiveDate: null as string | null,
  reviewed: false,
  cookieAuditApproved: false,
  claimsProcedureApproved: false,
};
// Deliberate code-review gate, not a query-string/localStorage activation switch.
export const LEGAL_RELEASE_READY = false;
export const legalPublicationReady = () => LEGAL_RELEASE_READY && legalIdentity.reviewed
  && legalIdentity.cookieAuditApproved && legalIdentity.claimsProcedureApproved
  && legalIdentity.taxIdVerified
  && [legalIdentity.holderName, legalIdentity.legalName, legalIdentity.taxIdType, legalIdentity.taxId, legalIdentity.address, legalIdentity.effectiveDate].every(value => Boolean(value?.trim()));
export const LEGAL_ROUTES = [
  ["politica-de-datos", "Política de Tratamiento de Datos Personales"],
  ["politica-de-cookies", "Política de Cookies"],
  ["terminos-y-condiciones", "Términos y Condiciones"],
  ["envios-y-entregas", "Envíos y Entregas"],
  ["cambios-devoluciones-y-garantias", "Cambios, Devoluciones y Garantías"],
  ["centro-de-privacidad", "Centro de Privacidad"],
] as const;
export const isLegalSlug = (slug: string) => slug === "legal-y-privacidad" || LEGAL_ROUTES.some(([key]) => key === slug);
export function legalRoute(path: string, development = import.meta.env?.DEV ?? false) {
  if (development && path.startsWith("/__legal-review/") && isLegalSlug(path.slice(16))) return { slug: path.slice(16), review: true };
  if (legalPublicationReady() && isLegalSlug(path.slice(1))) return { slug: path.slice(1), review: false };
  return null;
}
export const publicLegalPaths = () => legalPublicationReady() ? ["/legal-y-privacidad", ...LEGAL_ROUTES.map(([slug]) => `/${slug}`)] : [];
export const legalDocumentTitle = (slug: string) => LEGAL_ROUTES.find(([key]) => key === slug)?.[1] ?? "Legal y privacidad";
export const legalDescriptions: Record<string, string> = {
  "legal-y-privacidad": "Información legal, privacidad y canales de atención de Upgrade La 79.",
  "politica-de-datos": "Finalidades del tratamiento de datos personales, derechos y canales de atención de Upgrade La 79.",
  "politica-de-cookies": "Tecnologías necesarias, analíticas opcionales y cómo cambiar tus preferencias en Upgrade La 79.",
  "terminos-y-condiciones": "Condiciones del ecommerce, compras, compatibilidad y atención de Upgrade La 79.",
  "envios-y-entregas": "Modalidades, información de entrega, recogida y atención de incidencias en Upgrade La 79.",
  "cambios-devoluciones-y-garantias": "Información sobre garantías, retracto, devoluciones y canales de atención de Upgrade La 79.",
  "centro-de-privacidad": "Cómo consultar, corregir tus datos y gestionar tus decisiones de privacidad en Upgrade La 79.",
};
