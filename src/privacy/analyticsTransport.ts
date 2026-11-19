type Transports = Pick<typeof globalThis, "fetch" | "navigator" | "XMLHttpRequest" | "location">;

const collectionUrl = (input: string | URL | Request, base: string): URL | null => {
  try {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, base);
    const analyticsHost = url.hostname === "google-analytics.com" || url.hostname.endsWith(".google-analytics.com")
      || url.hostname === "analytics.google.com" || url.hostname === "www.google.com"
      || url.hostname === "www.googletagmanager.com";
    return analyticsHost && /\/(?:[a-z]+\/)?collect\/?$/.test(url.pathname) ? url : null;
  } catch { return null; } // Leave malformed/non-Analytics requests to the native API.
};

/** Install BEFORE the SDK captures its transports. A removed script/ga-disable
 * cannot cancel a batch already queued inside gtag.js. Gate collection at send
 * time, not just event creation. All non-Analytics traffic delegates unchanged.
 * Keep these guards installed after withdrawal: the SDK can retain references.
 */
export function installAnalyticsTransportGuard(target: Transports, allowed: () => boolean, measurementId: string): boolean {
  const denied = (input: string | URL | Request) => {
    const url = collectionUrl(input, target.location.href);
    return url !== null && (!allowed() || url.searchParams.get("tid") !== measurementId);
  };
  try {
    const originalFetch = target.fetch;
    if (originalFetch) target.fetch = function (input, init) {
      if (denied(input)) return Promise.reject(new DOMException("Analytics consent unavailable", "AbortError"));
      return Reflect.apply(originalFetch, this, [input, init]);
    };
    const originalBeacon = target.navigator?.sendBeacon;
    if (originalBeacon) target.navigator.sendBeacon = function (url, data) {
      if (denied(url)) return false;
      return Reflect.apply(originalBeacon, this, [url, data]);
    };
    const xhr = target.XMLHttpRequest?.prototype;
    if (xhr) {
      const urls = new WeakMap<XMLHttpRequest, string | URL>();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      xhr.open = function (...args: [method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null]) {
        urls.set(this, args[1]);
        return Reflect.apply(originalOpen, this, args);
      };
      xhr.send = function (body) {
        const url = urls.get(this);
        if (url !== undefined && denied(url)) { this.abort(); return; }
        return Reflect.apply(originalSend, this, [body]);
      };
    }
    return Boolean(originalFetch || originalBeacon || xhr);
  } catch { return false; } // A browser that forbids guards must not load GA4.
}
