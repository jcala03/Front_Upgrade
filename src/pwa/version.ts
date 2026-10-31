// Replaced by Vite at build time. The fallback is only for dev/isolated SSR test harnesses.
export const SERVICE_WORKER_VERSION = typeof __PWA_SW_VERSION__ === "string" ? __PWA_SW_VERSION__ : "development";
export const SERVICE_WORKER_URL = `/sw.js?v=${SERVICE_WORKER_VERSION}`;

export function isCurrentServiceWorker(worker: ServiceWorker): boolean {
  try {
    const url = new URL(worker.scriptURL);
    return url.pathname === "/sw.js" && url.searchParams.get("v") === SERVICE_WORKER_VERSION;
  } catch { return false; }
}
