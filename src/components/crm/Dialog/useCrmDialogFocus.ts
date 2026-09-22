import { useEffect, useRef, type RefObject } from "react";

const focusableSelector = [
  "a[href]:not([tabindex='-1'])",
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([tabindex='-1'])",
  "select:not([disabled]):not([tabindex='-1'])",
  "textarea:not([disabled]):not([tabindex='-1'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export const useCrmDialogFocus = <T extends HTMLElement>({ open, onClose, canClose = true }: { open: boolean; onClose: () => void; canClose?: boolean }): RefObject<T | null> => {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  const canCloseRef = useRef(canClose);

  useEffect(() => { closeRef.current = onClose; canCloseRef.current = canClose; }, [canClose, onClose]);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (dialog?.querySelector<HTMLElement>("[data-dialog-initial]") ?? dialog)?.focus({ preventScroll: true });

    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canCloseRef.current) { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) { event.preventDefault(); dialog.focus({ preventScroll: true }); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1]; const active = document.activeElement;
      const outsideTabSequence = !(active instanceof HTMLElement) || !focusable.includes(active);
      if (event.shiftKey && (active === first || outsideTabSequence)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || outsideTabSequence)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, [open]);

  return ref;
};
