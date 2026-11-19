export type CrmSessionInfo = {
  session_id: string;
  idle_timeout_seconds: number;
  server_time: number;
  expires_at: number;
};

export const CRM_IDLE_STORAGE_KEY = "upgrade79_crm_idle_session";
export const CRM_IDLE_NOTICE = "Tu sesión terminó por inactividad. Inicia sesión nuevamente. Los cambios que no guardaste pueden haberse perdido.";
const ACTIVITY_INTERVAL = 15_000;
type SharedSession = { id: string; userId: number; deadline: number; expired: boolean; reason?: "idle" | "logout" };

function readShared(win: Window): SharedSession | null {
  try {
    const value = JSON.parse(win.localStorage.getItem(CRM_IDLE_STORAGE_KEY) ?? "null");
    return value && typeof value.id === "string" && typeof value.userId === "number"
      && Number.isFinite(value.deadline) && typeof value.expired === "boolean" ? value : null;
  } catch { return null; }
}

export function clearSharedCrmSession(expectedSessionId?: string, reason: "idle" | "logout" = "logout") {
  try {
    const value = readShared(window);
    if (value && (!expectedSessionId || value.id === expectedSessionId)) window.localStorage.setItem(CRM_IDLE_STORAGE_KEY, JSON.stringify({ ...value, expired: true, reason }));
  } catch { /* The server still enforces expiry when browser storage is unavailable. */ }
}

export function resetSharedCrmSession() {
  try { window.localStorage.removeItem(CRM_IDLE_STORAGE_KEY); } catch { /* No credentials are stored here. */ }
}

/** Uses only trusted input events. Background HTTP, focus and visibility do not renew anything. */
export function startCrmIdleSession(options: {
  userId: number;
  status: () => Promise<CrmSessionInfo>;
  activity: () => Promise<CrmSessionInfo>;
  expire: (sessionId: string | null, reason: "idle" | "logout") => void;
  warn?: (show: boolean) => void;
  win?: Window;
  doc?: Document;
  now?: () => number;
}) {
  const win = options.win ?? window;
  const doc = options.doc ?? document;
  const now = options.now ?? Date.now;
  let state: SharedSession | null = null;
  let disposed = false;
  let expiring = false;
  let pending = false;
  let sending = false;
  let checking = false;
  let warning = false;
  let lastSent = 0;
  let activityTimer: number | undefined;

  const write = (value: SharedSession) => {
    state = value;
    try { win.localStorage.setItem(CRM_IDLE_STORAGE_KEY, JSON.stringify(value)); } catch { /* In-memory fallback. */ }
  };
  const expire = () => {
    if (disposed || expiring) return;
    expiring = true;
    const reason = state?.reason === "logout" ? "logout" : "idle";
    if (state) write({ ...state, expired: true, reason });
    options.expire(state?.id ?? null, reason);
  };
  const expired = () => !!state && (state.expired || now() >= state.deadline);
  const accept = (info: CrmSessionInfo) => {
    if (disposed || expiring) return;
    if (typeof info.session_id !== "string" || !/^[a-f0-9]{64}$/.test(info.session_id)
      || !Number.isFinite(info.expires_at) || !Number.isFinite(info.server_time)
      || !Number.isFinite(info.idle_timeout_seconds) || info.idle_timeout_seconds <= 0) throw new Error("Sesión no válida.");
    // Convert the server deadline into local time; never trust the browser clock as proof of activity.
    const remaining = Math.min(info.idle_timeout_seconds, info.expires_at - info.server_time);
    const shared = readShared(win);
    const sameSession = shared?.id === info.session_id && shared.userId === options.userId;
    if (sameSession && shared.expired) { state = shared; expire(); return; }
    // A delayed status response must not overwrite an interaction acknowledged in another tab.
    const deadline = Math.max(now() + remaining * 1000, sameSession ? shared.deadline : 0);
    write({ id: info.session_id, userId: options.userId, deadline, expired: deadline <= now() });
    if (warning && remaining > 60) { warning = false; options.warn?.(false); }
    if (expired()) expire();
  };
  const flush = async () => {
    activityTimer = undefined;
    if (disposed || expiring || sending || !pending || !state) return;
    if (expired()) { expire(); return; }
    const wait = ACTIVITY_INTERVAL - (now() - lastSent);
    if (wait > 0) { activityTimer = win.setTimeout(() => { void flush(); }, wait); return; }
    pending = false;
    sending = true;
    lastSent = now();
    try { accept(await options.activity()); } catch { /* A failed request never extends the clock. Auth API handles 401. */ }
    finally { sending = false; if (pending && !disposed && !expiring) void flush(); }
  };
  const check = () => {
    if (disposed || expiring) return;
    const shared = readShared(win);
    if (state && shared?.id === state.id && shared.userId === options.userId) state = shared;
    const showWarning = !!state && !expired() && state.deadline - now() <= 60_000;
    if (showWarning !== warning) { warning = showWarning; options.warn?.(warning); }
    if (expired()) expire();
  };
  const input = (event: Event) => {
    if (!event.isTrusted || doc.visibilityState !== "visible" || disposed || expiring) return;
    check();
    if (expiring) return;
    pending = true;
    if (state && activityTimer === undefined) void flush();
  };
  const refresh = async () => {
    check();
    if (checking || disposed || expiring || doc.visibilityState !== "visible") return;
    checking = true;
    try { accept(await options.status()); if (pending) void flush(); }
    catch { /* Offline is not evidence of a new session; preserve the known deadline. */ }
    finally { checking = false; }
  };
  const storage = (event: StorageEvent) => {
    if (event.key === CRM_IDLE_STORAGE_KEY) check();
  };
  const inputEvents = ["keydown", "input", "pointerdown", "pointermove", "touchstart", "wheel"];
  for (const name of inputEvents) doc.addEventListener(name, input, { passive: true });
  win.addEventListener("storage", storage);
  win.addEventListener("focus", refresh);
  win.addEventListener("online", refresh);
  doc.addEventListener("visibilitychange", refresh);
  const shared = readShared(win);
  if (shared?.userId === options.userId) state = shared;
  const interval = win.setInterval(check, 1000);
  void refresh();
  return () => {
    disposed = true;
    win.clearInterval(interval);
    if (activityTimer !== undefined) win.clearTimeout(activityTimer);
    for (const name of inputEvents) doc.removeEventListener(name, input);
    win.removeEventListener("storage", storage);
    win.removeEventListener("focus", refresh);
    win.removeEventListener("online", refresh);
    doc.removeEventListener("visibilitychange", refresh);
  };
}
