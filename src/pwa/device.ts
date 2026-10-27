export type DeviceSupport = { secure: boolean; serviceWorker: boolean; push: boolean; notification: boolean; ios: boolean; standalone: boolean };

export function deviceStatus(support: DeviceSupport, permission: NotificationPermission | "unsupported", subscribed: boolean) {
  if (support.ios && !support.standalone) return "ios-install";
  if (!support.secure || !support.serviceWorker || !support.push || !support.notification) return "unsupported";
  if (permission === "denied") return "blocked";
  return subscribed && permission === "granted" ? "enabled" : "disabled";
}

export function support(): DeviceSupport {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return {
    secure: window.isSecureContext, serviceWorker: "serviceWorker" in navigator,
    push: "PushManager" in window, notification: "Notification" in window, ios,
    standalone: window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  };
}

export const applicationServerKey = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export async function endpointHash(endpoint: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint))))
    .map((value) => value.toString(16).padStart(2, "0")).join("");
}
