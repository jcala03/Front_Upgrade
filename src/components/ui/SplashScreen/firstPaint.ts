const readyEvent = "upgrade79:splash-ready";
const initialSplashId = "initial-splash";
const stateAttribute = "data-home-splash";

// Runs in the SSR head, before the body can paint. Without JavaScript the cover
// stays hidden and the complete SSR landing remains usable. A failed entry
// script also reveals the landing instead of leaving an indefinite cover.
export const splashBootScript = `(() => {
  const html = document.documentElement;
  const cleanup = () => {
    window.removeEventListener("error", failOpen, true);
    window.removeEventListener("${readyEvent}", cleanup);
  };
  const failOpen = (event) => {
    if (event.target?.tagName === "SCRIPT" || event instanceof ErrorEvent) {
      html.removeAttribute("${stateAttribute}");
      cleanup();
    }
  };
  html.setAttribute("${stateAttribute}", "pending");
  window.addEventListener("error", failOpen, true);
  window.addEventListener("${readyEvent}", cleanup, { once: true });
})();`;

export function hasInitialSplash() {
  return typeof document !== "undefined"
    && document.documentElement.getAttribute(stateAttribute) === "pending"
    && Boolean(document.getElementById(initialSplashId));
}

export function handoffInitialSplash() {
  if (!hasInitialSplash()) return;
  document.documentElement.removeAttribute(stateAttribute);
  window.dispatchEvent(new Event(readyEvent));
}

export function finishInitialSplash() {
  if (typeof document === "undefined") return;
  handoffInitialSplash();
  document.getElementById(initialSplashId)?.remove();
}
