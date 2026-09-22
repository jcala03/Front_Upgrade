import { useEffect, useRef, type RefObject } from "react";

const selector = "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";

export const useCustomerDialogFocus = <T extends HTMLElement>(open: boolean, onEscape: () => void, canClose = true): RefObject<T | null> => {
  const ref = useRef<T>(null);
  const closeRef = useRef(onEscape);
  const canCloseRef = useRef(canClose);
  useEffect(() => { closeRef.current = onEscape; canCloseRef.current = canClose; }, [canClose, onEscape]);
  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root?.querySelector<HTMLElement>("[data-dialog-initial]")?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canCloseRef.current) { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab" || !root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((node) => node.getClientRects().length > 0);
      if (!nodes.length) { event.preventDefault(); root.focus(); return; }
      const first = nodes[0]; const last = nodes[nodes.length - 1]; const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !root.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [open]);
  return ref;
};
