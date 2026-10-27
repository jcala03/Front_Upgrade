import { useEffect, useRef, useState } from "react";
import { BellRing, Download } from "lucide-react";
import { deviceSubscriptions, pushConfig, removeSubscription, saveSubscription } from "../api/push";
import { getAuthUser } from "../utils/authStorage";
import { applicationServerKey, deviceStatus, endpointHash, support } from "./device";
import { currentRegistration, PWA_READY_EVENT, setDeviceOwner } from "./register";
import { PushDiagnostics } from "./PushDiagnostics";
import "./pwa.css";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

export function DeviceNotifications() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const lock = useRef(false);

  async function refresh() {
    if (lock.current) return;
    const capabilities = support();
    const permission = capabilities.notification ? Notification.permission : "unsupported";
    const initial = deviceStatus(capabilities, permission, false);
    if (["unsupported", "ios-install"].includes(initial)) { setStatus(initial); return; }
    const config = await pushConfig();
    if (lock.current) return;
    setAvailable(config.enabled); setPublicKey(config.public_key ?? "");
    if (!config.enabled) { setStatus(initial); return; }
    const subscription = await currentRegistration()?.pushManager.getSubscription();
    const devices = subscription ? await deviceSubscriptions() : [];
    const hash = subscription ? await endpointHash(subscription.endpoint) : null;
    const active = devices.some((item) => item.endpoint_hash === hash && item.is_active && (!item.expires_at || Date.parse(item.expires_at) > Date.now()));
    if (!lock.current) setStatus(deviceStatus(capabilities, permission, active));
  }
  useEffect(() => {
    let active = true;
    const update = () => { if (active) void refresh().then(() => { if (active && !lock.current) setError(""); }).catch(() => { if (active && !lock.current) { setStatus("disabled"); setError("No se pudo consultar el estado. Revisa tu conexión y vuelve a intentarlo."); } }); };
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    update(); window.addEventListener("focus", update); window.addEventListener(PWA_READY_EVENT, update); window.addEventListener("beforeinstallprompt", install);
    return () => { active = false; window.removeEventListener("focus", update); window.removeEventListener(PWA_READY_EVENT, update); window.removeEventListener("beforeinstallprompt", install); };
  }, []);

  async function activate() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    let created: PushSubscription | null = null;
    try {
      if (!navigator.onLine) throw new Error("Necesitas conexión para activar las notificaciones.");
      const registration = currentRegistration();
      if (!registration?.active || !publicKey) throw new Error("La aplicación aún no está lista. Recarga la página e inténtalo de nuevo.");
      // Keep the permission call directly inside the user's click gesture (required on iPhone).
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus(permission === "denied" ? "blocked" : "disabled"); return; }
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const devices = await deviceSubscriptions();
        const hash = await endpointHash(subscription.endpoint);
        const mine = devices.find((item) => item.endpoint_hash === hash);
        const key = subscription.options.applicationServerKey;
        const expected = applicationServerKey(publicKey);
        const sameKey = key && new Uint8Array(key).every((value, index) => expected[index] === value) && key.byteLength === expected.byteLength;
        if (!mine || !sameKey) {
          if (mine) await removeSubscription(mine.id);
          if (!await subscription.unsubscribe()) throw new Error("No se pudo renovar la suscripción anterior del dispositivo.");
          subscription = null;
        }
      }
      if (!subscription) { subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) }); created = subscription; }
      await saveSubscription(subscription);
      await setDeviceOwner(getAuthUser()?.id ?? null);
      setStatus("enabled");
    } catch (cause) {
      if (created) await created.unsubscribe().catch(() => {});
      setError(cause instanceof Error ? cause.message : "No se pudieron activar las notificaciones.");
    } finally { lock.current = false; setBusy(false); }
  }

  async function deactivate() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const subscription = await currentRegistration()?.pushManager.getSubscription();
      if (subscription) {
        const hash = await endpointHash(subscription.endpoint);
        const mine = (await deviceSubscriptions()).find((item) => item.endpoint_hash === hash);
        if (mine) await removeSubscription(mine.id);
        await setDeviceOwner(null);
        if (!await subscription.unsubscribe()) throw new Error("Push desactivado en el servidor. Cierra y vuelve a abrir la aplicación para actualizar el navegador.");
      }
      setStatus("disabled");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron desactivar las notificaciones."); }
    finally { lock.current = false; setBusy(false); }
  }

  const messages: Record<string, string> = {
    loading: "Consultando notificaciones del dispositivo…", enabled: "Notificaciones activadas.", disabled: "Notificaciones desactivadas.",
    blocked: "Permiso bloqueado. Puedes habilitarlo desde los ajustes del navegador o de la aplicación.",
    unsupported: "Este dispositivo o navegador no soporta Web Push. Puedes seguir consultando la campana del CRM.",
    "ios-install": "Para recibir notificaciones en iPhone, agrega Upgrade La 79 a tu pantalla de inicio. Abre Compartir → Agregar a pantalla de inicio y entra desde el nuevo icono (iOS/iPadOS 16.4 o posterior).",
  };
  return <section className="profile-card pwa-device" aria-labelledby="device-notifications-title">
    <header><BellRing aria-hidden="true" /><div><h3 id="device-notifications-title">Notificaciones del dispositivo</h3><p>Recibe las alertas importantes de tu bandeja del CRM, también cuando la aplicación no esté abierta.</p></div></header>
    <p role="status">{messages[status]}</p>
    {!["unsupported", "ios-install", "loading"].includes(status) && available === false && <p>El servicio Push aún no está habilitado. La campana del CRM sigue disponible.</p>}
    <div className="pwa-actions">
      {available && !["enabled", "blocked", "unsupported", "ios-install", "loading"].includes(status) && <button type="button" disabled={busy} onClick={() => void activate()}>{busy ? "Activando…" : "Activar notificaciones en este dispositivo"}</button>}
      {status === "enabled" && <button type="button" disabled={busy} onClick={() => void deactivate()}>{busy ? "Desactivando…" : "Desactivar notificaciones en este dispositivo"}</button>}
      {installPrompt && !support().standalone && <button type="button" onClick={() => { void installPrompt.prompt().then(() => installPrompt.userChoice).then(() => setInstallPrompt(null)); }}><Download size={18} aria-hidden="true" /> Instalar Upgrade La 79</button>}
    </div>
    {!installPrompt && !["ios-install", "loading"].includes(status) && <p className="pwa-help">Puedes instalar Upgrade La 79 desde el menú de tu navegador, si la opción está disponible.</p>}
    {error && <p className="pwa-error" role="alert">{error} <button type="button" onClick={() => { setError(""); void refresh().catch(() => setError("No se pudo consultar el estado. Revisa tu conexión.")); }}>Reintentar</button></p>}
    <PushDiagnostics />
  </section>;
}
