import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Download, Mail, MessageCircle } from "lucide-react";
import { downloadCommercialDocument, emailCommercialDocument, getCommercialDocument, whatsappMessage, whatsappNumber,
  type CommercialDocument, type CommercialDocumentKind, type CommercialDocumentScope } from "../api/commercialDocuments";
import { hasPermission } from "../utils/authStorage";
import "./CommercialDocumentActions.css";

/** Inline within the existing detail dialog: no second modal/focus trap. */
export function CommercialDocumentActions({ kind, scope, id, busy = false }: {
  kind: CommercialDocumentKind; scope: CommercialDocumentScope; id: number; busy?: boolean;
}) {
  const fieldId = useId();
  const [panel, setPanel] = useState<"email" | "whatsapp" | null>(null);
  const [document, setDocument] = useState<CommercialDocument | null>(null);
  const [running, setRunning] = useState<"meta" | "pdf" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const request = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const suffix = scope === "own" ? "_own" : "";
  const canView = hasPermission((kind === "quotation" ? "quotations" : "orders") + ".view" + suffix);
  const canEmail = hasPermission(kind === "quotation" ? scope === "own" ? "quotations.send_own" : "quotations.update" : "orders.create" + suffix);
  useEffect(() => () => {
    request.current?.abort();
    urls.current.forEach(url => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => { if (panel && document) input.current?.focus(); }, [panel, document]);
  const perform = async (action: "meta" | "pdf" | "email", task: (signal: AbortSignal) => Promise<void>) => {
    if (lock.current || busy) return;
    lock.current = true;setRunning(action);setError("");setFeedback("");
    const controller = new AbortController();request.current = controller;
    try { await task(controller.signal); }
    catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo preparar el documento."); }
    finally { lock.current = false;if (!controller.signal.aborted) setRunning(null); }
  };
  const download = () => perform("pdf", async signal => {
    const result = await downloadCommercialDocument(kind, scope, id, signal);
    if (!result.contentType?.toLowerCase().startsWith("application/pdf") || result.blob.size === 0) throw new Error("El servidor no devolvió un PDF válido.");
    const url = URL.createObjectURL(result.blob);urls.current.add(url);
    const anchor = window.document.createElement("a");
    anchor.href = url;anchor.download = result.filename ?? (kind === "quotation" ? "COT" : "ORDEN") + "-" + String(id).padStart(6, "0") + ".pdf";
    window.document.body.appendChild(anchor);anchor.click();anchor.remove();
    // Allow Chrome to consume the Blob before revocation. Nothing is kept in storage.
    window.setTimeout(() => { URL.revokeObjectURL(url);urls.current.delete(url); }, 1000);
    setDownloaded(true);setFeedback("Descarga solicitada. El navegador decide dónde guardar el PDF.");
  });
  const open = (next: "email" | "whatsapp") => {
    if (lock.current || busy) return;
    setPanel(next);setDocument(null);setDownloaded(false);
    void perform("meta", async signal => {
      const value = await getCommercialDocument(kind, scope, id, signal);
      setDocument(value);setEmail(value.customer.email ?? "");
      setPhone(whatsappNumber(value.customer.phone ?? "") ?? value.customer.phone ?? "");
    });
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!document?.can_email) return;
    void perform("email", async signal => {
      const result = await emailCommercialDocument(kind, scope, id, email.trim(), signal);
      setFeedback(result.message);
    });
  };
  const close = () => { setPanel(null);setError("");setFeedback(""); };
  const disabled = busy || running !== null;
  const number = whatsappNumber(phone);
  if (!canView) return null;
  return <section className="commercial-documents" aria-label="Documentos y envío" onKeyDown={event => {
    if (event.key === "Escape" && panel && !disabled) { event.stopPropagation();close(); }
  }}>
    <div className="commercial-documents__actions">
      <button type="button" disabled={disabled} onClick={() => void download()}><Download size={16} aria-hidden="true" />{running === "pdf" ? "Preparando PDF…" : "Descargar PDF"}</button>
      <button type="button" disabled={disabled} onClick={() => open("whatsapp")}><MessageCircle size={16} aria-hidden="true" />Enviar por WhatsApp</button>
      {canEmail ? <button type="button" disabled={disabled} onClick={() => open("email")}><Mail size={16} aria-hidden="true" />Enviar por correo</button> : null}
    </div>
    <p className="commercial-documents__hint">PDF privado bajo demanda. Descargar o compartir no cambia el estado de la operación.</p>
    {panel ? <div className="commercial-documents__panel" aria-busy={running !== null}>
      <h3>{panel === "email" ? "Revisar correo y adjunto" : "Compartir PDF manualmente"}</h3>
      {running === "meta" ? <p role="status">Consultando los datos guardados del cliente…</p> : null}
      {document ? <>
        <p><strong>{document.title}</strong> · {document.filename}</p>
        {panel === "email" ? document.can_email ? <form onSubmit={send}>
          <label htmlFor={fieldId + "-email"}>Destinatario<input ref={input} id={fieldId + "-email"} type="email" required maxLength={254} autoComplete="email" value={email} disabled={disabled} onChange={event => setEmail(event.target.value)} /></label>
          <p>{document.email_simulated ? "Modo de prueba: se adjunta el PDF con Laravel Mail, sin enviar ningún correo real." : "Se enviará este PDF al destinatario revisado. Comprueba la dirección antes de confirmar."}</p>
          <button type="submit" disabled={disabled}>{running === "email" ? "Preparando correo…" : document.email_simulated ? "Enviar correo de prueba" : "Confirmar envío por correo"}</button>
        </form> : <p role="alert">No tienes permiso para enviar este documento por correo.</p> : <>
          <label htmlFor={fieldId + "-phone"}>Número de WhatsApp con indicativo<input ref={input} id={fieldId + "-phone"} type="tel" value={phone} disabled={disabled} onChange={event => setPhone(event.target.value)} /></label>
          <p>Revisa el número. Para celulares colombianos de 10 dígitos se propone el indicativo 57. Para otros países indica el número internacional completo.</p>
          <p className="commercial-documents__message">{whatsappMessage(document)}</p>
          <p><strong>No se adjunta ni envía automáticamente.</strong> Descarga el PDF, abre el chat y adjunta el archivo desde WhatsApp.</p>
          <div className="commercial-documents__actions">
            <button type="button" disabled={disabled} onClick={() => void download()}>1. Descargar PDF</button>
            {downloaded && number ? <a href={"https://wa.me/" + number + "?text=" + encodeURIComponent(whatsappMessage(document))} target="_blank" rel="noopener noreferrer">2. Abrir WhatsApp</a> : <button type="button" disabled>2. Abrir WhatsApp</button>}
          </div>
          {!number ? <p role="status">Falta un número internacional válido para abrir el chat.</p> : null}
        </>}
      </> : null}
      <button type="button" disabled={disabled} onClick={close}>Cerrar opciones de envío</button>
    </div> : null}
    {error ? <p className="commercial-documents__error" role="alert">{error}</p> : null}
    {feedback ? <p role="status">{feedback}</p> : null}
  </section>;
}
