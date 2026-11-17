import { useEffect, useRef, useState } from "react";
import { readChoice, saveChoice, type PrivacyChoice } from "./consent";
import { applySavedAnalyticsChoice, denyAnalyticsNow, syncAnalytics, trackPage } from "./analytics";
import "./PrivacyControls.css";
import { privacyControlsEnabled } from "./config";

export function PrivacyControls({ pathname }: { pathname: string }) {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<PrivacyChoice | null>(null);
  const [panel, setPanel] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!privacyControlsEnabled) return;
    const refresh = () => { const current = readChoice(); setChoice(current); syncAnalytics(); trackPage(location.pathname + location.search); };
    const open = () => { returnFocus.current = document.activeElement as HTMLElement; setAnalytics(readChoice()?.analytics ?? false); setError(""); setPanel(true); };
    const storage = (event: StorageEvent) => {
      if (event.key !== "upgrade79_privacy_choice" && event.key !== null) return;
      // A new explicit choice in another tab replaces an earlier runtime denial.
      if (readChoice()?.analytics === true) applySavedAnalyticsChoice();
      refresh();
    };
    refresh(); setReady(true);
    window.addEventListener("upgrade79:privacy-open", open);
    window.addEventListener("upgrade79:privacy-change", refresh);
    window.addEventListener("storage", storage);
    window.addEventListener("popstate", refresh);
    const expiry = window.setInterval(refresh, 60000);
    return () => { window.clearInterval(expiry); window.removeEventListener("upgrade79:privacy-open", open); window.removeEventListener("upgrade79:privacy-change", refresh); window.removeEventListener("storage", storage); window.removeEventListener("popstate", refresh); syncAnalytics(); };
  }, [pathname]);
  useEffect(() => {
    if (!panel || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    return () => { dialog.current?.close(); returnFocus.current?.focus(); };
  }, [panel]);
  const choose = (accepted: boolean) => {
    if (!accepted) denyAnalyticsNow(); // Revocation cannot depend on successful persistence.
    const saved = saveChoice(accepted);
    if (!saved) { denyAnalyticsNow(); setError("No pudimos guardar tu elección en este navegador. Las analíticas permanecen desactivadas; puedes seguir usando la tienda."); return; }
    setChoice(saved); setError(""); applySavedAnalyticsChoice(); trackPage(location.pathname + location.search); setPanel(false);
  };
  if (!privacyControlsEnabled || !ready) return null; // SSR and first hydrated tree are identical.
  return <>
    {!choice && !panel ? <aside className="privacy-banner" aria-labelledby="privacy-banner-title">
      <h2 id="privacy-banner-title">Tu privacidad, tu decisión</h2>
      <p>En UP GRADE 79 utilizamos tecnologías necesarias para el funcionamiento de nuestra tienda. Con tu autorización, también usamos Google Analytics para conocer cómo navegan nuestros visitantes y mejorar su experiencia.</p>
      <p>Puedes aceptar o rechazar las cookies analíticas sin afectar las funciones esenciales de la tienda.</p>
      <p>Medimos visitas e interacciones comerciales, no tus datos de contacto. No autorizas publicidad. Consulta nuestra <a href="/politica-de-datos">información de privacidad</a>.</p>
      <div className="privacy-actions"><button type="button" onClick={() => choose(false)}>Rechazar opcionales</button><button type="button" onClick={() => { returnFocus.current = document.activeElement as HTMLElement; setPanel(true); }}>Configurar</button><button type="button" onClick={() => choose(true)}>Aceptar analíticas</button></div>
      {error ? <p role="alert">{error}</p> : null}
    </aside> : null}
    {panel ? <dialog ref={dialog} className="privacy-dialog" aria-labelledby="privacy-dialog-title" onCancel={() => setPanel(false)}>
      <h2 id="privacy-dialog-title">Configuración de privacidad</h2>
      <section><h3>Cookies necesarias — Siempre activas</h3><p>Permiten el funcionamiento esencial del sitio, incluyendo seguridad, sesiones y características necesarias de la tienda.</p></section>
      <section><label className="privacy-check"><input autoFocus type="checkbox" checked={analytics} onChange={event => setAnalytics(event.target.checked)} /><span>Cookies analíticas — Opcionales</span></label><p>Nos permiten utilizar Google Analytics para comprender las visitas, analizar la navegación y mejorar nuestros servicios.</p></section>
      <p>La elección analítica no autoriza publicidad. Puedes cambiarla desde el pie de página.</p>
      <p><a href="/politica-de-datos">Información de privacidad y derechos</a></p>
      <div className="privacy-actions"><button type="button" onClick={() => choose(analytics)}>Guardar preferencias</button><button type="button" onClick={() => choose(false)}>Rechazar opcionales</button><button type="button" onClick={() => choose(true)}>Aceptar analíticas</button><button type="button" onClick={() => setPanel(false)}>Cerrar</button></div>
      {error ? <p role="alert">{error}</p> : null}
    </dialog> : null}
  </>;
}
