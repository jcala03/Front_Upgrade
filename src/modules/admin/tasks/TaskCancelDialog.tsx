import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { cancelTask } from "../../../api/tasks";
import { ApiError } from "../../../api/http";
import { CrmDialog } from "../../../components/crm/Dialog";
import type { Task } from "../../../types/task";

export const TaskCancelDialog = ({ task, onClose, onCancelled }: { task: Task | null; onClose: () => void; onCancelled: () => void }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!task || saving) return;
    setError(""); setFieldError("");
    if (!reason.trim()) { setFieldError("El motivo de cancelación es obligatorio."); return; }
    setSaving(true);
    try {
      await cancelTask(task.id, reason.trim());
      onCancelled();
    } catch (cause) {
      if (cause instanceof ApiError) setFieldError(cause.errors.reason?.[0] ?? "");
      setError(cause instanceof Error ? cause.message : "No se pudo cancelar la tarea.");
    } finally { setSaving(false); }
  };

  return <CrmDialog open={Boolean(task)} titleId="task-cancel-title" onClose={onClose} busy={saving} className="task-cancel-dialog"><form className="task-cancel" onSubmit={submit} noValidate aria-busy={saving}>
    <header><div><span>Confirmación</span><h2 id="task-cancel-title" data-dialog-initial tabIndex={-1}>Cancelar tarea</h2></div><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    <div className="task-cancel__body"><p><strong>{task?.title}</strong> permanecerá en el histórico con estado Cancelada.</p><label><span>Motivo de cancelación</span><textarea required maxLength={255} value={reason} disabled={saving} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "task-cancel-reason-error" : undefined} onChange={(event) => setReason(event.target.value)} />{fieldError ? <small id="task-cancel-reason-error" className="task-field-error">{fieldError}</small> : null}</label>{error ? <p className="task-cancel__error" role="alert">{error}</p> : null}</div>
    <footer><button type="button" disabled={saving} onClick={onClose}>Volver</button><button className="is-danger" type="submit" disabled={saving}>{saving ? "Cancelando..." : "Cancelar tarea"}</button></footer>
  </form></CrmDialog>;
};
