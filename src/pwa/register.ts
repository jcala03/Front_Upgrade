import { AUTH_USER_EVENT, getAuthUser } from "../utils/authStorage";
import { API_BASE_URL } from "../api/apiConfig";

export const PWA_UPDATE_EVENT = "pwa:update-ready";
export const PWA_READY_EVENT = "pwa:ready";
export const PUSH_RECEIVED_EVENT = "pwa:push-received";
let registration: ServiceWorkerRegistration | null = null;
let pendingOwner: number | null | undefined;

export const currentRegistration = () => registration;

export async function setDeviceOwner(userId: number | null) {
  pendingOwner = userId;
  const worker = registration?.active ?? ("serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistration("/").catch(() => undefined))?.active : undefined);
  if (!worker) return;
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => { channel.port1.close(); resolve(); }, 1500);
    channel.port1.onmessage = () => { window.clearTimeout(timeout); channel.port1.close(); resolve(); };
    try { worker.postMessage({ type: "PUSH_OWNER", userId }, [channel.port2]); }
    catch { window.clearTimeout(timeout); channel.port1.close(); resolve(); }
  });
}

export function registerPwa() {
  if (!import.meta.env.PROD || !window.isSecureContext || !("serviceWorker" in navigator)) return;
  // Listeners are installed once, outside React's StrictMode effects.
  window.addEventListener(AUTH_USER_EVENT, (event) => { void setDeviceOwner((event as CustomEvent<{ id: number } | null>).detail?.id ?? null).catch(() => {}); });
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "CRM_PUSH_RECEIVED") window.dispatchEvent(new Event(PUSH_RECEIVED_EVENT));
  });
  void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(async (value) => {
    registration = value;
    const announce = () => { if (value.waiting) window.dispatchEvent(new Event(PWA_UPDATE_EVENT)); };
    announce();
    value.addEventListener("updatefound", () => value.installing?.addEventListener("statechange", announce));
    const ready = await navigator.serviceWorker.ready;
    registration = ready;
    window.dispatchEvent(new Event(PWA_READY_EVENT));
    const user = getAuthUser();
    if (pendingOwner !== undefined) await setDeviceOwner(pendingOwner);
    else if (user) {
      // Storage is per tab, cookies are shared. Confirm the real session before rebinding a reopened tab.
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
        if (response.ok) {
          const { user: current } = await response.json();
          if (pendingOwner === undefined) await setDeviceOwner(Number.isSafeInteger(current?.id) && current?.permissions?.includes("notifications.view") ? current.id : null);
        } else if ([401, 403].includes(response.status) && pendingOwner === undefined) await setDeviceOwner(null);
      } catch { /* Offline must not overwrite the last verified device binding. */ }
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navigator.onLine) void value.update().catch(() => {});
    });
  }).catch(() => { /* The profile reports unavailable registration; the regular website still works. */ });
}

export function applyPwaUpdate() {
  const waiting = registration?.waiting;
  if (!waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  waiting.postMessage({ type: "SKIP_WAITING" });
}

export async function updateAppBadge(count: number) {
  const badge = navigator as Navigator & { setAppBadge?: (count: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try { if (count > 0) await badge.setAppBadge?.(count); else await badge.clearAppBadge?.(); } catch { /* Optional API. */ }
}
