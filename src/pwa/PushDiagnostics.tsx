import { useState } from "react";
import { clearPushDiagnostics, getPushDiagnostics, type PushDiagnostic } from "./diagnostics";
import { SERVICE_WORKER_VERSION } from "./version";

// TEMPORARY: remove this panel and the SW tracing once the device delay is identified.
export function PushDiagnostics() {
  const [records, setRecords] = useState<PushDiagnostic[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(clear = false) {
    setBusy(true); setError("");
    try { setRecords(await (clear ? clearPushDiagnostics() : getPushDiagnostics())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "El diagnóstico no está disponible."); }
    finally { setBusy(false); }
  }

  return <details className="pwa-diagnostics">
    <summary>Diagnóstico Push</summary>
    <p className="pwa-help">Temporal · historial local de este dispositivo · máximo 30 eventos. Horas en UTC (ISO).</p>
    <p className="pwa-help">Versión SW esperada: <code>{SERVICE_WORKER_VERSION}</code></p>
    <div className="pwa-actions">
      <button type="button" disabled={busy} onClick={() => void update()}>Actualizar diagnóstico</button>
      <button type="button" disabled={busy} onClick={() => void update(true)}>Limpiar diagnóstico</button>
    </div>
    <p className="pwa-help" role="status">{busy ? "Consultando diagnóstico…" : records === null ? "Pulsa Actualizar diagnóstico para leer los últimos eventos." : records.length === 0 ? "Sin registros diagnósticos." : `${records.length} eventos, del más reciente al más antiguo.`}</p>
    {error && <p className="pwa-error" role="alert">{error}</p>}
    {records && records.length > 0 && <ol className="pwa-diagnostics-list">
      {records.map((record) => <li key={record.id}>
        <time dateTime={record.timestamp}>{record.timestamp}</time>
        <code>{record.stage}{record.notification_id !== undefined ? ` #${record.notification_id}` : ""}</code>
        {(record.payload_user_id !== undefined || record.stored_owner !== undefined) && <small>Usuario del payload: {record.payload_user_id ?? "—"} · Owner guardado: {record.stored_owner ?? "—"}</small>}
        {record.path && <small>Ruta: {record.path}</small>}
        {record.error && <small>Error técnico: {record.error}</small>}
      </li>)}
    </ol>}
  </details>;
}
