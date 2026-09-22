import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, MapPin, Pencil, Plus, Power, X } from "lucide-react";
import { createBranch, getBranch, listBranches, updateBranch } from "../../../api/branches";
import { ApiError } from "../../../api/http";
import { CrmDialog } from "../../../components/crm/Dialog";
import { StatusBadge } from "../../../components/crm/StatusBadge";
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from "../../../types/branch";
import { hasPermission } from "../../../utils/authStorage";
import "./AdminBranchesPage.css";

type BranchFormState = {
  code: string;
  name: string;
  city: string;
};

const emptyForm: BranchFormState = { code: "", name: "", city: "" };

const branchForm = (branch: Branch | null): BranchFormState => branch
  ? { code: branch.code, name: branch.name, city: branch.city }
  : { ...emptyForm };

export const AdminBranchesPage = () => {
  const canCreate = hasPermission("branches.create");
  const canUpdate = hasPermission("branches.update");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [confirming, setConfirming] = useState<Branch | null>(null);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await listBranches(signal);
      if (current === requestId.current) setBranches(result.data);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError") && current === requestId.current) {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las sedes.");
      }
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => {
      requestId.current += 1;
      controller.abort();
    };
  }, [load]);

  const openEdit = async (branch: Branch) => {
    setError("");
    setMutatingId(branch.id);
    try {
      setEditing(await getBranch(branch.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la sede.");
    } finally {
      setMutatingId(null);
    }
  };

  const saved = (branch: Branch, created: boolean) => {
    setBranches((current) => created
      ? [...current, branch].sort((left, right) => left.name.localeCompare(right.name, "es"))
      : current.map((item) => item.id === branch.id ? branch : item));
    setEditing(null);
    setMessage(created ? "Sede creada correctamente." : "Sede actualizada correctamente.");
  };

  const changeStatus = async (branch: Branch, active: boolean) => {
    if (mutatingId !== null) return;
    setMutatingId(branch.id);
    setError("");
    setMessage("");
    try {
      const updated = await updateBranch(branch.id, { is_active: active });
      setBranches((current) => current.map((item) => item.id === updated.id ? updated : item));
      setConfirming(null);
      setMessage(active ? "Sede activada correctamente." : "Sede desactivada correctamente.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el estado de la sede.");
      setConfirming(null);
    } finally {
      setMutatingId(null);
    }
  };

  return <section className="admin-branches" aria-labelledby="branches-heading">
    <header className="branches-header">
      <div><span>Operación multisede</span><h2 id="branches-heading">Sedes</h2><p>Administra las ubicaciones operativas disponibles para empleados y procesos del CRM.</p></div>
      {canCreate ? <button className="is-primary" type="button" onClick={() => { setEditing("new"); setMessage(""); }}><Plus size={18} aria-hidden="true" />Nueva sede</button> : null}
    </header>

    {message ? <p className="branches-feedback" role="status">{message}</p> : null}
    {error ? <div className="branches-feedback is-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div> : null}
    {loading && branches.length === 0 ? <div className="branches-state" role="status"><Building2 size={28} aria-hidden="true" /><p>Cargando sedes...</p></div> : null}
    {!loading && branches.length === 0 ? <div className="branches-state"><Building2 size={28} aria-hidden="true" /><p>Todavía no hay sedes registradas.</p>{canCreate ? <button className="is-primary" type="button" onClick={() => setEditing("new")}>Crear primera sede</button> : null}</div> : null}

    {branches.length > 0 ? <div className="branches-grid" aria-busy={loading}>
      {branches.map((branch) => <article className={`branch-card ${branch.is_active ? "" : "is-inactive"}`} key={branch.id}>
        <header><div className="branch-card__identity"><span className="branch-card__icon"><Building2 size={21} aria-hidden="true" /></span><div><small>{branch.code}</small><h3>{branch.name}</h3></div></div><StatusBadge label={branch.is_active ? "Activa" : "Inactiva"} tone={branch.is_active ? "success" : "neutral"} /></header>
        <dl><div><dt>Ciudad</dt><dd><MapPin size={15} aria-hidden="true" />{branch.city}</dd></div><div><dt>Identificador</dt><dd>{branch.slug}</dd></div></dl>
        {canUpdate ? <footer><button type="button" disabled={mutatingId !== null} onClick={() => void openEdit(branch)}><Pencil size={16} aria-hidden="true" />Editar</button>{branch.is_active ? <button className="is-status" type="button" disabled={mutatingId !== null} onClick={() => { setConfirming(branch); setMessage(""); }}><Power size={16} aria-hidden="true" />Desactivar</button> : <button className="is-status is-activate" type="button" disabled={mutatingId !== null} onClick={() => void changeStatus(branch, true)}><Power size={16} aria-hidden="true" />{mutatingId === branch.id ? "Activando..." : "Activar"}</button>}</footer> : null}
      </article>)}
    </div> : null}

    <CrmDialog open={editing !== null} titleId="branch-form-title" onClose={() => setEditing(null)} busy={mutatingId !== null}>
      {editing !== null ? <BranchForm branch={editing === "new" ? null : editing} onBusy={(busy) => setMutatingId(busy ? (editing === "new" ? 0 : editing.id) : null)} onClose={() => setEditing(null)} onSaved={saved} /> : null}
    </CrmDialog>

    <CrmDialog open={confirming !== null} titleId="branch-confirm-title" onClose={() => setConfirming(null)} busy={mutatingId !== null}>
      {confirming ? <article className="branch-confirm"><header><div><span>Confirmación operativa</span><h2 id="branch-confirm-title">Desactivar sede</h2></div><button type="button" aria-label="Cerrar confirmación" disabled={mutatingId !== null} onClick={() => setConfirming(null)}><X size={20} aria-hidden="true" /></button></header><div><p>¿Deseas desactivar <strong>{confirming.name}</strong>?</p><p>La sede seguirá visible en información histórica. El backend impedirá la acción si conserva empleados activos asignados.</p></div><footer><button type="button" disabled={mutatingId !== null} onClick={() => setConfirming(null)}>Cancelar</button><button className="is-primary" type="button" disabled={mutatingId !== null} onClick={() => void changeStatus(confirming, false)}>{mutatingId === confirming.id ? "Desactivando..." : "Desactivar sede"}</button></footer></article> : null}
    </CrmDialog>
  </section>;
};

const BranchForm = ({ branch, onBusy, onClose, onSaved }: { branch: Branch | null; onBusy: (busy: boolean) => void; onClose: () => void; onSaved: (branch: Branch, created: boolean) => void }) => {
  const creating = branch === null;
  const [form, setForm] = useState<BranchFormState>(() => branchForm(branch));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const lock = useRef(false);
  const fieldError = (field: string) => errors[field]?.[0];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    setError("");
    setErrors({});
    const name = form.name.trim();
    const city = form.city.trim();
    const code = form.code.trim().toUpperCase();
    if (!name || !city || (creating && !code)) {
      setError("Completa los campos obligatorios.");
      return;
    }
    lock.current = true;
    setSaving(true);
    onBusy(true);
    try {
      const saved = creating
        ? await createBranch({ code, name, city } satisfies CreateBranchPayload)
        : await updateBranch(branch.id, { name, city } satisfies UpdateBranchPayload);
      onSaved(saved, creating);
    } catch (cause) {
      if (cause instanceof ApiError) setErrors(cause.errors);
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la sede.");
    } finally {
      lock.current = false;
      setSaving(false);
      onBusy(false);
    }
  };

  return <form className="branch-form" onSubmit={submit}><header><div><span>Configuración multisede</span><h2 id="branch-form-title">{creating ? "Crear sede" : "Editar sede"}</h2></div><button type="button" aria-label="Cerrar formulario" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header><div className="branch-form__body">
    <label><span>Código *</span><input autoFocus={creating} required={creating} readOnly={!creating} maxLength={20} autoCapitalize="characters" value={form.code} disabled={saving} aria-invalid={Boolean(fieldError("code"))} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />{fieldError("code") ? <small className="branch-field-error">{fieldError("code")}</small> : null}{!creating ? <small>El código es inmutable.</small> : null}</label>
    <label><span>Nombre *</span><input autoFocus={!creating} required maxLength={160} value={form.name} disabled={saving} aria-invalid={Boolean(fieldError("name"))} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />{fieldError("name") ? <small className="branch-field-error">{fieldError("name")}</small> : null}</label>
    <label className="is-wide"><span>Ciudad *</span><input required maxLength={160} value={form.city} disabled={saving} aria-invalid={Boolean(fieldError("city"))} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />{fieldError("city") ? <small className="branch-field-error">{fieldError("city")}</small> : null}</label>
    {error ? <p className="branch-form__error is-wide" role="alert">{error}</p> : null}
  </div><footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : creating ? "Crear sede" : "Guardar cambios"}</button></footer></form>;
};
