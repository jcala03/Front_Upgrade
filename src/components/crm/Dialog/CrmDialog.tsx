import type { ReactNode } from "react";
import { useCrmDialogFocus } from "./useCrmDialogFocus";
import "./CrmDialog.css";

export const CrmDialog = ({ open, titleId, onClose, busy = false, closeOnBackdrop = true, children, className = "" }: { open: boolean; titleId: string; onClose: () => void; busy?: boolean; closeOnBackdrop?: boolean; children: ReactNode; className?: string }) => {
  const ref = useCrmDialogFocus<HTMLDivElement>({ open, onClose, canClose: !busy });
  if (!open) return null;

  return <div className={`crm-dialog ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
    <button className="crm-dialog__backdrop" type="button" aria-label="Cerrar diálogo" tabIndex={-1} disabled={busy || !closeOnBackdrop} onClick={onClose} />
    <div className="crm-dialog__panel">{children}</div>
  </div>;
};
