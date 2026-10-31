// TEMPORARY, device-local Push tracing. No backend requests or subscription secrets.
import { isCurrentServiceWorker } from "./version";

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

type DiagnosticErrorCode = "unsupported" | "no_worker" | "registration_error" | "worker_outdated" | "timeout" | "rejected" | "invalid_response" | "channel_error";
const diagnosticErrors: Record<DiagnosticErrorCode, string> = {
  unsupported: "Este navegador no admite Service Workers.",
  no_worker: "La aplicación aún no tiene un Service Worker activo.",
  registration_error: "No se pudo consultar el registro local del Service Worker.",
  worker_outdated: "La versión activa del Service Worker no corresponde a este build. Si aparece «Actualizar aplicación», guarda tus cambios y acepta la actualización. Si aún se está preparando, vuelve a intentarlo cuando termine.",
  timeout: "El Service Worker no respondió en 2500 ms. Puede estar bloqueado o no implementar este mensaje; el timeout por sí solo no distingue esas causas.",
  rejected: "El Service Worker respondió { ok: false }: no pudo acceder al almacenamiento del diagnóstico local.",
  invalid_response: "El Service Worker devolvió una respuesta de diagnóstico no compatible.",
  channel_error: "Falló la comunicación local por MessageChannel con el Service Worker.",
};

export class PushDiagnosticError extends Error {
  constructor(public readonly code: DiagnosticErrorCode) {
    super(`[${code}] ${diagnosticErrors[code]}`);
    this.name = "PushDiagnosticError";
  }
}

async function requestDiagnostics(type: "PUSH_DIAGNOSTICS_GET" | "PUSH_DIAGNOSTICS_CLEAR"): Promise<PushDiagnostic[]> {
  if (!("serviceWorker" in navigator)) throw new PushDiagnosticError("unsupported");
  let registration: ServiceWorkerRegistration | undefined;
  try { registration = await navigator.serviceWorker.getRegistration("/"); }
  catch { throw new PushDiagnosticError("registration_error"); }
  const worker = registration?.active;
  if (!worker) throw new PushDiagnosticError("no_worker");
  if (!isCurrentServiceWorker(worker)) throw new PushDiagnosticError("worker_outdated");
  return new Promise((resolve, reject) => {
    let channel: MessageChannel;
    try { channel = new MessageChannel(); } catch { reject(new PushDiagnosticError("channel_error")); return; }
    const finish = (records?: PushDiagnostic[], error?: DiagnosticErrorCode) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      if (records) resolve(records); else reject(new PushDiagnosticError(error ?? "invalid_response"));
    };
    const timeout = window.setTimeout(() => finish(undefined, "timeout"), 2500);
    channel.port1.onmessage = (event: MessageEvent<{ ok?: boolean; records?: PushDiagnostic[] }>) => {
      if (event.data?.ok === false) { finish(undefined, "rejected"); return; }
      if (event.data?.ok !== true || !Array.isArray(event.data.records)) { finish(undefined, "invalid_response"); return; }
      const records = event.data.records.filter((record) => record && Number.isSafeInteger(record.id)
        && typeof record.timestamp === "string" && Number.isFinite(Date.parse(record.timestamp))
        && typeof record.stage === "string");
      finish(records.sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id - a.id).slice(0, 30));
    };
    channel.port1.onmessageerror = () => finish(undefined, "channel_error");
    try { worker.postMessage({ type }, [channel.port2]); }
    catch { finish(undefined, "channel_error"); }
  });
}

export const getPushDiagnostics = () => requestDiagnostics("PUSH_DIAGNOSTICS_GET");
export const clearPushDiagnostics = () => requestDiagnostics("PUSH_DIAGNOSTICS_CLEAR");

export function recordPushClientOpen(worker: ServiceWorker | null) {
  // Do not await this or place it behind auth/network requests. Never include query/hash.
  try { worker?.postMessage({ type: "PUSH_DIAGNOSTIC_CLIENT_OPEN" }); } catch { /* Diagnostic only. */ }
}
