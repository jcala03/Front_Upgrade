import { useEffect, useRef, useState, type FormEvent } from "react";
import { CustomersApiError } from "../../../api/customers";
import type { Customer, CustomerPayload } from "../../../types/customer";
import { useCustomerDialogFocus } from "./useCustomerDialogFocus";

type Props = { open: boolean; customer?: Customer | null; onClose: () => void; onSave: (payload: CustomerPayload) => Promise<void> };
const empty = { name: "", phone: "", email: "", document: "", city: "", address: "", notes: "", is_active: true };

export const CustomerForm = ({ open, customer, onClose, onSave }: Props) => {
  const [form, setForm] = useState(empty); const [error, setError] = useState(""); const [errors, setErrors] = useState<Record<string, string[]>>({}); const [saving, setSaving] = useState(false); const lock = useRef(false);
  const close = () => { if (!lock.current) onClose(); };
  const fieldError = (field: string) => errors[field]?.[0];
  const clearFieldError = (field: string) => setErrors((current) => { const next = { ...current }; delete next[field]; return next; });
  const dialogRef = useCustomerDialogFocus<HTMLDivElement>(open, close, !saving);
  useEffect(() => { if (open) setForm(customer ? { name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "", document: customer.document ?? "", city: customer.city ?? "", address: customer.address ?? "", notes: customer.notes ?? "", is_active: customer.is_active } : empty); setError(""); setErrors({}); }, [customer, open]);
  useEffect(() => { if (!open) return; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = overflow; }; }, [open]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (lock.current) return; if (!form.name.trim()) { setErrors({ name: ["El nombre es obligatorio."] }); return; }
    lock.current = true; setSaving(true); setError(""); setErrors({});
    const clean = (value: string) => value.trim() || null;
    try { await onSave({ name: form.name.trim(), phone: clean(form.phone), email: clean(form.email), document: clean(form.document), city: clean(form.city), address: clean(form.address), notes: clean(form.notes), is_active: form.is_active }); }
    catch (cause) {
      if (cause instanceof CustomersApiError) {
        setErrors(cause.errors);
        const knownFields = ["name", "phone", "email", "document", "city", "address", "notes", "is_active"];
        const fields = Object.keys(cause.errors);
        setError(fields.length > 0 && fields.every((field) => knownFields.includes(field)) ? "" : cause.message);
      } else setError(cause instanceof Error ? cause.message : "No se pudo guardar el cliente.");
    }
    finally { lock.current = false; setSaving(false); }
  };
  if (!open) return null;
  return <div ref={dialogRef} className="customers-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-form-title" tabIndex={-1}>
    <button className="customers-dialog__backdrop" tabIndex={-1} type="button" disabled={saving} onClick={close} aria-label="Cerrar formulario" />
    <form className="customers-dialog__panel" onSubmit={submit}><header><div><span>Cliente comercial</span><h2 id="customer-form-title" tabIndex={-1} data-dialog-initial>{customer ? "Editar cliente" : "Nuevo cliente"}</h2></div><button type="button" disabled={saving} onClick={close}>Cerrar</button></header>
      <div className="customers-dialog__body"><div className="customers-form-grid">{([['name','Nombre *','text'],['phone','Teléfono','tel'],['email','Email','email'],['document','Documento','text'],['city','Ciudad','text'],['address','Dirección','text']] as const).map(([key,label,type]) => { const message = fieldError(key); const errorId = `customer-${key}-error`; return <label className="customers-field" key={key}><span>{label}</span><input type={type} value={form[key]} aria-invalid={Boolean(message)} aria-describedby={message ? errorId : undefined} onChange={(event) => { setForm((current) => ({ ...current, [key]: event.target.value })); clearFieldError(key); }} />{message ? <small id={errorId} className="customers-field-error">{message}</small> : null}</label>; })}<label className="customers-field customers-field--full"><span>Notas</span><textarea value={form.notes} aria-invalid={Boolean(fieldError("notes"))} aria-describedby={fieldError("notes") ? "customer-notes-error" : undefined} onChange={(event) => { setForm((current) => ({ ...current, notes: event.target.value })); clearFieldError("notes"); }} />{fieldError("notes") ? <small id="customer-notes-error" className="customers-field-error">{fieldError("notes")}</small> : null}</label>{customer ? <label className="customers-toggle"><input type="checkbox" checked={form.is_active} onChange={(event) => { setForm((current) => ({ ...current, is_active: event.target.checked })); clearFieldError("is_active"); }} /> Cliente activo{fieldError("is_active") ? <small className="customers-field-error">{fieldError("is_active")}</small> : null}</label> : null}</div>{error ? <p className="customers-error" role="alert">{error}</p> : null}</div>
      <footer><button type="button" disabled={saving} onClick={close}>Cancelar</button><button className="is-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : customer ? "Guardar cambios" : "Crear cliente"}</button></footer></form>
  </div>;
};
