import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Search, X } from "lucide-react";
import { createUser, getUsers, updateUser } from "../../../api/users";
import { SettingsApiError } from "../../../api/settings";
import type { AdminUser, CreateUserPayload, UserFilters } from "../../../types/settings";
import { getAuthUser, hasPermission } from "../../../utils/authStorage";
import { useCustomerDialogFocus } from "../customers/useCustomerDialogFocus";

const roleLabel = (role: AdminUser["role"]) => role === "admin" ? "Administrador" : "Usuario";
const date = (value: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value));
const initialFilters: UserFilters = { search: "", role: "", is_active: "", page: 1, per_page: 25 };
const emptyCreate: CreateUserPayload = { name: "", email: "", password: "", password_confirmation: "", role: "user", is_active: true };

export const UsersSection = () => {
  const currentUser = getAuthUser();
  const canCreate = hasPermission("users.create"); const canUpdate = hasPermission("users.update"); const canManageRoles = hasPermission("roles.manage");
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState<Awaited<ReturnType<typeof getUsers>> | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const sequence = useRef(0);
  const load = async () => {
    const request = ++sequence.current; const controller = new AbortController(); setLoading(true); setError("");
    try { const data = await getUsers(filters, controller.signal); if (request === sequence.current) setResult(data); }
    catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError") && request === sequence.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios."); }
    finally { if (request === sequence.current) setLoading(false); }
    return () => controller.abort();
  };
  useEffect(() => { let cleanup: (() => void) | undefined; void load().then((value) => { cleanup = value; }); return () => { sequence.current += 1; cleanup?.(); }; }, [filters]);
  const apply = (event: FormEvent) => { event.preventDefault(); setFilters({ ...draftFilters, page: 1 }); };
  const saved = async (user: AdminUser) => { setEditing(null); setResult((current) => current ? { ...current, data: current.data.map((item) => item.id === user.id ? user : item) } : current); await load(); };

  return <section className="users-section" aria-labelledby="users-title">
    <header className="settings-section-title users-section__header"><div><h3 id="users-title">Usuarios</h3><p>Administra el acceso del equipo al CRM.</p></div>{canCreate ? <button type="button" onClick={() => setEditing("new")}><Plus size={18} aria-hidden="true" />Nuevo usuario</button> : null}</header>
    <form className="users-filters" onSubmit={apply}>
      <label><span>Buscar</span><input type="search" placeholder="Nombre o email" value={draftFilters.search} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} /></label>
      <label><span>Rol</span><select value={draftFilters.role} onChange={(event) => setDraftFilters((current) => ({ ...current, role: event.target.value as UserFilters["role"] }))}><option value="">Todos</option><option value="admin">Administrador</option><option value="user">Usuario</option></select></label>
      <label><span>Estado</span><select value={draftFilters.is_active} onChange={(event) => setDraftFilters((current) => ({ ...current, is_active: event.target.value as UserFilters["is_active"] }))}><option value="">Todos</option><option value="1">Activos</option><option value="0">Inactivos</option></select></label>
      <button type="submit" disabled={loading}><Search size={17} aria-hidden="true" />Aplicar</button>
    </form>
    {error ? <div className="settings-state settings-state--error" role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>Reintentar</button></div> : null}
    {loading && !result ? <p className="settings-state" role="status">Cargando usuarios...</p> : null}
    {result && result.data.length === 0 ? <p className="settings-state">No encontramos usuarios con estos filtros.</p> : null}
    {result && result.data.length > 0 ? <><div className="users-table-wrap"><table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Creación</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{result.data.map((user) => <tr key={user.id}><td data-label="Nombre"><strong>{user.name}</strong>{user.id === currentUser?.id ? <small>Tu cuenta</small> : null}</td><td data-label="Email">{user.email}</td><td data-label="Rol">{roleLabel(user.role)}</td><td data-label="Estado"><span className={`user-status ${user.is_active ? "is-active" : "is-inactive"}`}>{user.is_active ? "Activo" : "Inactivo"}</span></td><td data-label="Creación">{date(user.created_at)}</td><td>{canUpdate ? <button type="button" className="user-edit" onClick={() => setEditing(user)}>Editar</button> : null}</td></tr>)}</tbody></table></div>
      <nav className="users-pagination" aria-label="Paginación de usuarios"><button type="button" disabled={loading || result.current_page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page! - 1 }))}>Anterior</button><span>Página {result.current_page} de {result.last_page}</span><button type="button" disabled={loading || result.current_page >= result.last_page} onClick={() => setFilters((current) => ({ ...current, page: current.page! + 1 }))}>Siguiente</button></nav></> : null}
    {editing ? <UserDialog value={editing} currentUserId={currentUser?.id ?? 0} canManageRoles={canManageRoles} onClose={() => setEditing(null)} onSaved={saved} /> : null}
  </section>;
};

const UserDialog = ({ value, currentUserId, canManageRoles, onClose, onSaved }: { value: AdminUser | "new"; currentUserId: number; canManageRoles: boolean; onClose: () => void; onSaved: (user: AdminUser) => Promise<void> }) => {
  const creating = value === "new"; const own = !creating && value.id === currentUserId;
  const [form, setForm] = useState<CreateUserPayload>(creating ? emptyCreate : { name: value.name, email: value.email, role: value.role, is_active: value.is_active, password: "", password_confirmation: "" });
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [errors, setErrors] = useState<Record<string, string[]>>({}); const lock = useRef(false);
  const panel = useCustomerDialogFocus<HTMLDivElement>(true, onClose, !saving);
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = overflow; }; }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (lock.current) return; setError(""); setErrors({});
    if (!form.name.trim() || !form.email.trim()) { setError("Nombre y email son obligatorios."); return; }
    if (creating && form.password !== form.password_confirmation) { setErrors({ password_confirmation: ["Las contraseñas no coinciden."] }); return; }
    lock.current = true; setSaving(true);
    try {
      const user = creating ? await createUser({ ...form, name: form.name.trim(), email: form.email.trim() }) : await updateUser(value.id, { name: form.name.trim(), email: form.email.trim(), ...(!own ? { is_active: form.is_active } : {}), ...(!own && canManageRoles ? { role: form.role } : {}) });
      await onSaved(user);
    } catch (cause) { if (cause instanceof SettingsApiError) setErrors(cause.errors); setError(cause instanceof Error ? cause.message : "No se pudo guardar el usuario."); }
    finally { lock.current = false; setSaving(false); }
  };
  return <div className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title"><button type="button" className="settings-dialog__backdrop" aria-label="Cerrar formulario" onClick={onClose} disabled={saving} /><div className="settings-dialog__panel" ref={panel} tabIndex={-1}><header><div><span>Equipo CRM</span><h2 id="user-dialog-title" tabIndex={-1} data-dialog-initial>{creating ? "Nuevo usuario" : "Editar usuario"}</h2></div><button type="button" aria-label="Cerrar" onClick={onClose} disabled={saving}><X aria-hidden="true" size={20} /></button></header><form onSubmit={submit}>
    <label><span>Nombre *</span><input autoFocus type="text" value={form.name} disabled={saving} aria-invalid={Boolean(errors.name)} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />{errors.name?.[0] ? <small className="field-error">{errors.name[0]}</small> : null}</label>
    <label><span>Email *</span><input type="email" value={form.email} disabled={saving} aria-invalid={Boolean(errors.email)} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />{errors.email?.[0] ? <small className="field-error">{errors.email[0]}</small> : null}</label>
    <label><span>Rol</span><select value={form.role} disabled={saving || (!creating && (own || !canManageRoles))} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AdminUser["role"] }))}><option value="admin">Administrador</option><option value="user">Usuario</option></select><small className="settings-dialog__hint">Usuario: acceso operativo limitado al CRM.</small></label>
    {creating ? <><label><span>Contraseña *</span><input type="password" autoComplete="new-password" value={form.password} disabled={saving} aria-invalid={Boolean(errors.password)} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label><label><span>Confirmar contraseña *</span><input type="password" autoComplete="new-password" value={form.password_confirmation} disabled={saving} aria-invalid={Boolean(errors.password_confirmation)} onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))} />{errors.password_confirmation?.[0] ? <small className="field-error">{errors.password_confirmation[0]}</small> : null}</label></> : null}
    <label className="settings-checkbox"><input type="checkbox" checked={form.is_active} disabled={saving || own} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /><span>Usuario activo</span></label>
    {own ? <p className="settings-dialog__hint">Gestiona tus datos desde Mi perfil. Tu estado y rol no pueden cambiarse desde aquí.</p> : null}{error ? <p role="alert" className="settings-dialog__error">{error}</p> : null}
    <footer><button type="button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="is-primary" disabled={saving}>{saving ? "Guardando..." : creating ? "Crear usuario" : "Guardar cambios"}</button></footer>
  </form></div></div>;
};
