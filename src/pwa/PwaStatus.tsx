import { useEffect, useState } from "react";
import { applyPwaUpdate, currentRegistration, PWA_UPDATE_EVENT } from "./register";
import "./pwa.css";

export function PwaStatus() {
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && navigator.onLine === false);
  const [update, setUpdate] = useState(Boolean(currentRegistration()?.waiting));
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    const ready = () => setUpdate(true);
    window.addEventListener("online", online); window.addEventListener("offline", online); window.addEventListener(PWA_UPDATE_EVENT, ready);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", online); window.removeEventListener(PWA_UPDATE_EVENT, ready); };
  }, []);
  return <>
    {offline && <div className="pwa-banner" role="alert">Sin conexión. Las ventas, los pagos y los cambios de inventario requieren internet. No se guardarán para enviarlos automáticamente.</div>}
    {update && <div className="pwa-banner" role="status">Hay una actualización disponible. Guarda tus cambios antes de recargar. <button type="button" onClick={applyPwaUpdate}>Actualizar aplicación</button></div>}
  </>;
}
