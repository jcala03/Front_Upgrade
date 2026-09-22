import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Building2, FileText, Save, UsersRound } from "lucide-react";
import { getSettings, SettingsApiError, updateSettings } from "../../../api/settings";
import type { SettingsData, UpdateSettingsPayload } from "../../../types/settings";
import { hasPermission } from "../../../utils/authStorage";
import { UsersSection } from "./UsersSection";
import "./AdminSettingsPage.css";

type Section = "general" | "sales" | "users";
const empty: UpdateSettingsPayload = {
  business: { business_name: "", legal_name: null, tax_id: null, phone: null, email: null, whatsapp: null, address: null, city: null },
  sales: { quotation_validity_days: 15, order_notification_email: null },
};
const clean = (value: string | null) => value?.trim() || null;
const editable = (settings: SettingsData): UpdateSettingsPayload => ({ business: { ...settings.business }, sales: { ...settings.sales } });
const fieldError = (errors: Record<string, string[]>, key: string) => errors[key]?.[0] ?? errors[key.split(".").at(-1) ?? key]?.[0];

export const AdminSettingsPage = () => {
  const canUpdate = hasPermission("settings.update");
  const canViewUsers = hasPermission("users.view");
  const [section, setSection] = useState<Section>("general");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [draft, setDraft] = useState<UpdateSettingsPayload>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const lock = useRef(false);

  const load = async () => {
    setLoading(true); setError("");
    try { const result = await getSettings(); setSettings(result); setDraft(editable(result)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const dirty = useMemo(() => settings ? JSON.stringify(draft) !== JSON.stringify(editable(settings)) : false, [draft, settings]);

  const business = (key: keyof UpdateSettingsPayload["business"], value: string) => setDraft((current) => ({ ...current, business: { ...current.business, [key]: key === "business_name" ? value : clean(value) } }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!canUpdate || !dirty || lock.current) return;
    const days = Number(draft.sales.quotation_validity_days);
    if (!Number.isInteger(days) || days < 1 || days > 365) { setErrors({ "sales.quotation_validity_days": ["La vigencia debe ser un número entero entre 1 y 365."] }); return; }
    if (draft.business.email && !/^\S+@\S+\.\S+$/.test(draft.business.email)) { setErrors({ "business.email": ["Ingresa un email de contacto válido."] }); return; }
    if (draft.sales.order_notification_email && !/^\S+@\S+\.\S+$/.test(draft.sales.order_notification_email)) { setErrors({ "sales.order_notification_email": ["Ingresa un email de notificación válido."] }); return; }
    lock.current = true; setSaving(true); setError(""); setSuccess(""); setErrors({});
    try { const result = await updateSettings(draft); setSettings(result); setDraft(editable(result)); setSuccess("Configuración guardada correctamente."); }
    catch (cause) { if (cause instanceof SettingsApiError) setErrors(cause.errors); setError(cause instanceof Error ? cause.message : "No se pudo guardar la configuración."); }
    finally { lock.current = false; setSaving(false); }
  };

  if (loading) return <section className="admin-settings"><p className="settings-state" role="status">Cargando configuración...</p></section>;
  if (!settings) return <section className="admin-settings"><div className="settings-state settings-state--error" role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>Reintentar</button></div></section>;

  return <section className="admin-settings">
    <header className="settings-hero"><div><span>Administración</span><h2>Configuración del CRM</h2><p>Gestiona la identidad del negocio, reglas comerciales y usuarios internos.</p></div></header>
    <div className="settings-shell">
      <nav className="settings-tabs" aria-label="Secciones de configuración">
        <button type="button" className={section === "general" ? "is-active" : ""} aria-current={section === "general" ? "page" : undefined} onClick={() => setSection("general")}><Building2 aria-hidden="true" size={18} />General</button>
        <button type="button" className={section === "sales" ? "is-active" : ""} aria-current={section === "sales" ? "page" : undefined} onClick={() => setSection("sales")}><FileText aria-hidden="true" size={18} />Ventas y cotizaciones</button>
        {canViewUsers ? <button type="button" className={section === "users" ? "is-active" : ""} aria-current={section === "users" ? "page" : undefined} onClick={() => setSection("users")}><UsersRound aria-hidden="true" size={18} />Usuarios</button> : null}
      </nav>
      <div className="settings-content">
        {section === "users" && canViewUsers ? <UsersSection /> : <form onSubmit={submit} noValidate>
          {section === "general" ? <>
            <header className="settings-section-title"><h3>Información general</h3><p>Datos públicos y administrativos básicos del negocio.</p></header>
            <div className="settings-form-grid">
              {([ ["business_name", "Nombre comercial", "text"], ["legal_name", "Razón social", "text"], ["tax_id", "NIT", "text"], ["phone", "Teléfono", "tel"], ["email", "Email de contacto", "email"], ["whatsapp", "WhatsApp", "tel"], ["address", "Dirección", "text"], ["city", "Ciudad", "text"] ] as const).map(([key, label, type]) => <label className={key === "address" ? "is-wide" : ""} key={key}><span>{label}{key === "business_name" ? " *" : ""}</span><input type={type} value={draft.business[key] ?? ""} required={key === "business_name"} disabled={!canUpdate || saving} aria-invalid={Boolean(fieldError(errors, `business.${key}`))} onChange={(event) => business(key, event.target.value)} />{fieldError(errors, `business.${key}`) ? <small className="field-error">{fieldError(errors, `business.${key}`)}</small> : null}</label>)}
            </div>
            <section className="regional-card" aria-labelledby="regional-title"><div><h3 id="regional-title">Configuración regional</h3><p>La operación comercial utiliza hora de Colombia.</p></div><dl><div><dt>Moneda</dt><dd>{settings.regional.currency}</dd></div><div><dt>Zona horaria</dt><dd>{settings.regional.timezone}</dd></div></dl></section>
          </> : <>
            <header className="settings-section-title"><h3>Ventas y cotizaciones</h3><p>Valores predeterminados para la operación comercial.</p></header>
            <div className="settings-form-grid settings-form-grid--single">
              <label><span>Vigencia predeterminada de cotizaciones</span><div className="settings-number"><input type="number" min="1" max="365" step="1" value={draft.sales.quotation_validity_days} disabled={!canUpdate || saving} aria-invalid={Boolean(fieldError(errors, "sales.quotation_validity_days"))} onChange={(event) => setDraft((current) => ({ ...current, sales: { ...current.sales, quotation_validity_days: Number(event.target.value) } }))} /><span>días</span></div><small>Afecta solamente nuevas cotizaciones sin fecha de vigencia definida explícitamente.</small>{fieldError(errors, "sales.quotation_validity_days") ? <small className="field-error">{fieldError(errors, "sales.quotation_validity_days")}</small> : null}</label>
              <label><span>Email para nuevas órdenes ecommerce</span><input type="email" value={draft.sales.order_notification_email ?? ""} disabled={!canUpdate || saving} aria-invalid={Boolean(fieldError(errors, "sales.order_notification_email"))} onChange={(event) => setDraft((current) => ({ ...current, sales: { ...current.sales, order_notification_email: clean(event.target.value) } }))} /><small>Destinatario interno cuando ingresa una nueva orden ecommerce. Puede dejarse vacío.</small>{fieldError(errors, "sales.order_notification_email") ? <small className="field-error">{fieldError(errors, "sales.order_notification_email")}</small> : null}</label>
            </div>
          </>}
          <div className="settings-feedback" aria-live="polite">{success ? <p className="is-success">{success}</p> : null}{error ? <p role="alert">{error}</p> : null}</div>
          <footer className="settings-save"><p>{settings.updated_at ? `Última actualización ${new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.updated_at))}${settings.updated_by ? ` por ${settings.updated_by.name}` : ""}.` : "Aún no hay una actualización registrada."}</p>{canUpdate ? <button type="submit" disabled={!dirty || saving}><Save aria-hidden="true" size={18} />{saving ? "Guardando..." : "Guardar cambios"}</button> : <span>Modo de solo lectura</span>}</footer>
        </form>}
      </div>
    </div>
  </section>;
};
