import { useEffect, useRef, type DependencyList } from "react";

/** A denied action is discarded, never queued for a later consent. Impressions
 * can be evaluated again when consent changes; the sender deduplicates them. */
export function useAnalyticsEvent(send: () => unknown, dependencies: DependencyList) {
  const current = useRef(send);
  current.current = send;
  useEffect(() => {
    // Measurement failures must never interrupt rendering or a commercial flow.
    const emit = () => { try { current.current(); } catch { /* Optional measurement only. */ } };
    emit();
    window.addEventListener("upgrade79:analytics-ready", emit);
    return () => window.removeEventListener("upgrade79:analytics-ready", emit);
  }, dependencies);
}
