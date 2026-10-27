// TEMPORARY, device-local Push tracing. No backend requests or subscription secrets.
export type PushDiagnostic = {
  id: number;
  timestamp: string;
  stage: string;
  notification_id?: number;
  payload_user_id?: number | null;
  stored_owner?: number | null;
  error?: string;
  path?: string;
};

const unavailable = "No se pudo leer el diagnóstico. Comprueba que la aplicación esté actualizada y vuelve a intentarlo.";

async function requestDiagnostics(type: "PUSH_DIAGNOSTICS_GET" | "PUSH_DIAGNOSTICS_CLEAR"): Promise<PushDiagnostic[]> {
  if (!("serviceWorker" in navigator)) throw new Error("Este navegador no tiene un Service Worker activo.");
  const registration = await navigator.serviceWorker.getRegistration("/").catch(() => undefined);
  const worker = registration?.active;
  if (!worker) throw new Error("La aplicación aún no tiene un Service Worker activo.");
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const finish = (records?: PushDiagnostic[]) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      if (records) resolve(records); else reject(new Error(unavailable));
    };
    const timeout = window.setTimeout(() => finish(), 2500);
    channel.port1.onmessage = (event: MessageEvent<{ ok?: boolean; records?: PushDiagnostic[] }>) => {
      if (!event.data?.ok || !Array.isArray(event.data.records)) { finish(); return; }
      const records = event.data.records.filter((record) => record && Number.isSafeInteger(record.id)
        && typeof record.timestamp === "string" && Number.isFinite(Date.parse(record.timestamp))
        && typeof record.stage === "string");
      finish(records.sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id - a.id).slice(0, 30));
    };
    channel.port1.onmessageerror = () => finish();
    try { worker.postMessage({ type }, [channel.port2]); }
    catch { finish(); }
  });
}

export const getPushDiagnostics = () => requestDiagnostics("PUSH_DIAGNOSTICS_GET");
export const clearPushDiagnostics = () => requestDiagnostics("PUSH_DIAGNOSTICS_CLEAR");

export function recordPushClientOpen(worker: ServiceWorker | null) {
  // Do not await this or place it behind auth/network requests. Never include query/hash.
  try { worker?.postMessage({ type: "PUSH_DIAGNOSTIC_CLIENT_OPEN" }); } catch { /* Diagnostic only. */ }
}
