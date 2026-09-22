import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BriefcaseBusiness, Building2, KeyRound, Search, UserRoundCheck, UserRoundX, X } from "lucide-react";
import { listBranches } from "../../../api/branches";
import {
  createEmployee,
  deactivateEmployee,
  EmployeesApiError,
  getEmployee,
  getEmployees,
  grantEmployeeCrmAccess,
  updateEmployee,
} from "../../../api/employees";
import { getUsers } from "../../../api/users";
import type { Employee, EmployeeFilters, EmployeePayload } from "../../../types/employee";
import type { Branch } from "../../../types/branch";
import type { AdminUser } from "../../../types/settings";
import { hasPermission } from "../../../utils/authStorage";
import { useDialogFocus } from "../orders/useDialogFocus";
import "./AdminEmployeesPage.css";

type StatusFilter = "" | "1" | "0";
type LinkFilter = "" | "1" | "0";
type FormState = {
  user_id: string;
  branch_id: string;
  name: string;
  phone: string;
  job_title: string;
  specialty: string;
  notes: string;
  is_active: boolean;
  hire_date: string;
};

const emptyForm: FormState = {
  user_id: "",
  branch_id: "",
  name: "",
  phone: "",
  job_title: "",
  specialty: "",
  notes: "",
  is_active: true,
  hire_date: "",
};

const dateOnly = (value: string | null) => {
  if (!value) return "Sin registrar";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(year, month - 1, day));
};

const formFromEmployee = (employee: Employee): FormState => ({
  user_id: employee.user_id === null ? "" : String(employee.user_id),
  branch_id: employee.branch_id === null ? "" : String(employee.branch_id),
  name: employee.name,
  phone: employee.phone ?? "",
  job_title: employee.job_title,
  specialty: employee.specialty ?? "",
  notes: employee.notes ?? "",
  is_active: employee.is_active,
  hire_date: employee.hire_date?.slice(0, 10) ?? "",
});

const crmAccess = (employee: Employee) => {
  if (!employee.user) return { label: "Sin acceso CRM", className: "is-none", Icon: UserRoundX };
  if (!employee.user.is_active) return { label: "Acceso CRM inactivo", className: "is-inactive", Icon: UserRoundX };
  return { label: "Con acceso CRM", className: "is-active", Icon: UserRoundCheck };
};

const branchLabel = (employee: Employee) => employee.branch
  ? `${employee.branch.name}${employee.branch.is_active ? "" : " · Inactiva"}`
  : "Sin sede";

export const AdminEmployeesPage = () => {
  const canCreate = hasPermission("employees.create");
  const canUpdate = hasPermission("employees.update");
  const canDeactivate = hasPermission("employees.delete");
  const canViewUsers = hasPermission("users.view");
  const canViewBranches = hasPermission("branches.view");
  const canGrantAccess = canUpdate && hasPermission("users.create");
  const canViewSchedules = hasPermission("employee_schedules.view");
  const canViewLeaves = hasPermission("employee_leaves.view");
  const canViewTasks = hasPermission("tasks.view");
  const [draftSearch, setDraftSearch] = useState("");
  const [draftJobTitle, setDraftJobTitle] = useState("");
  const [draftSpecialty, setDraftSpecialty] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [linkedUser, setLinkedUser] = useState<LinkFilter>("");
  const [branchId, setBranchId] = useState("");
  const [sort, setSort] = useState<NonNullable<EmployeeFilters["sort"]>>("name");
  const [direction, setDirection] = useState<NonNullable<EmployeeFilters["direction"]>>("asc");
  const [filters, setFilters] = useState({ search: "", job_title: "", specialty: "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Awaited<ReturnType<typeof getEmployees>> | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<Employee | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);
  const [grantingAccess, setGrantingAccess] = useState<Employee | null>(null);
  const [mutating, setMutating] = useState(false);
  const requestId = useRef(0);
  const detailRequestId = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const data = await getEmployees({
        search: filters.search || undefined,
        job_title: filters.job_title || undefined,
        specialty: filters.specialty || undefined,
        is_active: status,
        linked_user: linkedUser,
        branch_id: branchId ? Number(branchId) : undefined,
        sort,
        direction,
        page,
        per_page: 25,
      }, signal);
      if (current === requestId.current) setResult(data);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError") && current === requestId.current) {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar los empleados.");
      }
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [branchId, direction, filters, linkedUser, page, sort, status]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => {
      requestId.current += 1;
      controller.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!canViewBranches) return;
    const controller = new AbortController();
    setBranchesLoading(true);
    setBranchesError("");
    listBranches(controller.signal)
      .then((result) => setBranches(result.data))
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setBranchesError(cause instanceof Error ? cause.message : "No se pudieron cargar las sedes.");
        }
      })
      .finally(() => setBranchesLoading(false));
    return () => controller.abort();
  }, [canViewBranches]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ search: draftSearch.trim(), job_title: draftJobTitle.trim(), specialty: draftSpecialty.trim() });
    setPage(1);
  };

  const openDetail = async (id: number) => {
    const current = ++detailRequestId.current;
    setDetail(null);
    setDetailLoading(true);
    setError("");
    try {
      const employee = await getEmployee(id);
      if (current === detailRequestId.current) setDetail(employee);
    } catch (cause) {
      if (current === detailRequestId.current) setError(cause instanceof Error ? cause.message : "No se pudo cargar el empleado.");
    } finally {
      if (current === detailRequestId.current) setDetailLoading(false);
    }
  };

  const closeDialogs = () => {
    if (mutating) return;
    detailRequestId.current += 1;
    setDetail(null);
    setDetailLoading(false);
    setEditing(null);
    setDeactivating(null);
    setGrantingAccess(null);
  };

  const saved = async (employee: Employee, created: boolean) => {
    setEditing(null);
    setMessage(created ? "Empleado registrado correctamente." : "Empleado actualizado correctamente.");
    setResult((current) => current ? { ...current, data: current.data.map((item) => item.id === employee.id ? employee : item) } : current);
    await load();
  };

  const accessGranted = (employee: Employee) => {
    setGrantingAccess(null);
    setMessage("Acceso CRM creado correctamente.");
    setResult((current) => current ? { ...current, data: current.data.map((item) => item.id === employee.id ? employee : item) } : current);
    setDetail((current) => current?.id === employee.id ? employee : current);
  };

  const confirmDeactivate = async () => {
    if (!deactivating || mutating) return;
    setMutating(true);
    setError("");
    try {
      await deactivateEmployee(deactivating.id);
      setDeactivating(null);
      setMessage("Empleado desactivado. Su registro se conserva.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo desactivar el empleado.");
    } finally {
      setMutating(false);
    }
  };

  const hasRows = Boolean(result?.data.length);

  return <section className="admin-employees" aria-labelledby="employees-heading">
    <header className="employees-header">
      <div><span>Equipo operativo</span><h2 id="employees-heading">Empleados</h2><p>Consulta colaboradores, cargos, especialidades y su acceso independiente al CRM.</p></div>
      {canCreate ? <button className="is-primary" type="button" onClick={() => { setEditing("new"); setMessage(""); }}><BriefcaseBusiness size={18} aria-hidden="true" />Registrar empleado</button> : null}
    </header>

    <form className="employees-filters" onSubmit={applyFilters}>
      <label><span>Buscar</span><input type="search" placeholder="Nombre, teléfono, cargo o especialidad" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} /></label>
      <label><span>Estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }}><option value="">Todos</option><option value="1">Activos</option><option value="0">Inactivos</option></select></label>
      <label><span>Acceso CRM</span><select value={linkedUser} onChange={(event) => { setLinkedUser(event.target.value as LinkFilter); setPage(1); }}><option value="">Todos</option><option value="1">Con usuario</option><option value="0">Sin usuario</option></select></label>
      {canViewBranches ? <label><span>Sede</span><select value={branchId} disabled={branchesLoading || Boolean(branchesError)} onChange={(event) => { setBranchId(event.target.value); setPage(1); }}><option value="">Todas las sedes</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.code}{branch.is_active ? "" : " · Inactiva"}</option>)}</select></label> : null}
      <label><span>Cargo exacto</span><input value={draftJobTitle} placeholder="Ej. Instalador" onChange={(event) => setDraftJobTitle(event.target.value)} /></label>
      <label><span>Especialidad exacta</span><input value={draftSpecialty} placeholder="Ej. Audio" onChange={(event) => setDraftSpecialty(event.target.value)} /></label>
      <label><span>Ordenar por</span><select value={`${sort}:${direction}`} onChange={(event) => { const [nextSort, nextDirection] = event.target.value.split(":") as [typeof sort, typeof direction]; setSort(nextSort); setDirection(nextDirection); setPage(1); }}><option value="name:asc">Nombre A–Z</option><option value="name:desc">Nombre Z–A</option><option value="job_title:asc">Cargo A–Z</option><option value="hire_date:desc">Ingreso reciente</option><option value="created_at:desc">Registro reciente</option></select></label>
      <button type="submit" disabled={loading}><Search size={17} aria-hidden="true" />Aplicar</button>
    </form>

    {message ? <p className="employees-message" role="status">{message}</p> : null}
    {error ? <div className="employees-message is-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div> : null}
    {loading && !result ? <p className="employees-state" role="status">Cargando empleados...</p> : null}
    {!loading && result && !hasRows ? <div className="employees-state"><p>{canCreate ? "Todavía no hay empleados con estos filtros. Puedes registrar el primer colaborador operativo." : "No hay empleados disponibles con estos filtros."}</p>{canCreate ? <button className="is-primary" type="button" onClick={() => setEditing("new")}>Registrar empleado</button> : null}</div> : null}

    {result && hasRows ? <>
      <div className="employees-table-wrap"><table><thead><tr><th>Nombre</th><th>Sede</th><th>Cargo</th><th>Especialidad</th><th>Teléfono</th><th>Acceso CRM</th><th>Estado</th><th>Ingreso</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{result.data.map((employee) => {
        const access = crmAccess(employee); const AccessIcon = access.Icon;
        return <tr key={employee.id}><td><strong>{employee.name}</strong></td><td><span className={`employee-branch ${employee.branch ? "" : "is-none"}`}><Building2 size={15} aria-hidden="true" />{branchLabel(employee)}</span></td><td>{employee.job_title}</td><td>{employee.specialty ?? "—"}</td><td>{employee.phone ?? "—"}</td><td><span className={`employee-access ${access.className}`}><AccessIcon size={15} aria-hidden="true" />{access.label}</span></td><td><span className={`employee-status ${employee.is_active ? "is-active" : "is-inactive"}`}>{employee.is_active ? "Activo" : "Inactivo"}</span></td><td>{dateOnly(employee.hire_date)}</td><td><div className="employee-actions"><button type="button" onClick={() => void openDetail(employee.id)}>Ver</button>{canGrantAccess && !employee.user ? <button type="button" className="is-access" onClick={() => setGrantingAccess(employee)}><KeyRound size={15} aria-hidden="true" />Dar acceso CRM</button> : null}{canUpdate ? <button type="button" onClick={() => setEditing(employee)}>Editar</button> : null}{canDeactivate && employee.is_active ? <button className="is-danger" type="button" onClick={() => setDeactivating(employee)}>Desactivar</button> : null}</div></td></tr>;
      })}</tbody></table></div>
      <div className="employees-cards">{result.data.map((employee) => { const access = crmAccess(employee); const AccessIcon = access.Icon; return <article key={employee.id}><header><div><strong>{employee.name}</strong><small>{employee.job_title}</small></div><span className={`employee-status ${employee.is_active ? "is-active" : "is-inactive"}`}>{employee.is_active ? "Activo" : "Inactivo"}</span></header><span className={`employee-branch ${employee.branch ? "" : "is-none"}`}><Building2 size={15} aria-hidden="true" />{branchLabel(employee)}</span><dl><div><dt>Especialidad</dt><dd>{employee.specialty ?? "Sin registrar"}</dd></div><div><dt>Teléfono</dt><dd>{employee.phone ?? "Sin registrar"}</dd></div><div><dt>Ingreso</dt><dd>{dateOnly(employee.hire_date)}</dd></div></dl><span className={`employee-access ${access.className}`}><AccessIcon size={15} aria-hidden="true" />{access.label}</span><div className="employee-actions"><button type="button" onClick={() => void openDetail(employee.id)}>Ver</button>{canGrantAccess && !employee.user ? <button type="button" className="is-access" onClick={() => setGrantingAccess(employee)}><KeyRound size={15} aria-hidden="true" />Dar acceso CRM</button> : null}{canUpdate ? <button type="button" onClick={() => setEditing(employee)}>Editar</button> : null}{canDeactivate && employee.is_active ? <button className="is-danger" type="button" onClick={() => setDeactivating(employee)}>Desactivar</button> : null}</div></article>; })}</div>
      <nav className="employees-pagination" aria-label="Paginación de empleados"><button type="button" disabled={loading || result.current_page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {result.current_page} de {result.last_page}</span><button type="button" disabled={loading || result.current_page >= result.last_page} onClick={() => setPage((value) => value + 1)}>Siguiente</button></nav>
    </> : null}

    {detail || detailLoading ? <EmployeeDialog onClose={closeDialogs} busy={false}><EmployeeDetail employee={detail} loading={detailLoading} canViewSchedules={canViewSchedules} canViewLeaves={canViewLeaves} canViewTasks={canViewTasks} onClose={closeDialogs} /></EmployeeDialog> : null}
    {editing ? <EmployeeDialog onClose={closeDialogs} busy={mutating}><EmployeeForm employee={editing === "new" ? null : editing} canViewUsers={canViewUsers} canViewBranches={canViewBranches} branches={branches} branchesLoading={branchesLoading} branchesError={branchesError} onBusy={setMutating} onSaved={saved} onClose={closeDialogs} /></EmployeeDialog> : null}
    {grantingAccess ? <EmployeeDialog onClose={closeDialogs} busy={mutating}><CrmAccessForm employee={grantingAccess} onBusy={setMutating} onSaved={accessGranted} onClose={closeDialogs} /></EmployeeDialog> : null}
    {deactivating ? <EmployeeDialog onClose={closeDialogs} busy={mutating}><article className="employee-confirm"><header><div><span>Confirmación</span><h2 id="employee-dialog-title" data-dialog-initial tabIndex={-1}>Desactivar empleado</h2></div></header><div><p><strong>{deactivating.name}</strong> dejará de estar disponible para nuevas asignaciones. Su historial se conservará.</p><p>Esta acción no desactiva ni elimina su usuario CRM vinculado.</p></div><footer><button type="button" disabled={mutating} onClick={closeDialogs}>Cancelar</button><button className="is-danger" type="button" disabled={mutating} onClick={() => void confirmDeactivate()}>{mutating ? "Desactivando..." : "Desactivar empleado"}</button></footer></article></EmployeeDialog> : null}
  </section>;
};

const EmployeeDialog = ({ children, onClose, busy }: { children: ReactNode; onClose: () => void; busy: boolean }) => {
  const ref = useDialogFocus<HTMLDivElement>({ open: true, onEscape: onClose, canClose: !busy });
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, []);
  return <div className="employee-dialog" role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title" ref={ref} tabIndex={-1}><button className="employee-dialog__backdrop" type="button" aria-label="Cerrar" tabIndex={-1} onClick={onClose} disabled={busy} /><div className="employee-dialog__panel">{children}</div></div>;
};

const EmployeeDetail = ({ employee, loading, canViewSchedules, canViewLeaves, canViewTasks, onClose }: { employee: Employee | null; loading: boolean; canViewSchedules: boolean; canViewLeaves: boolean; canViewTasks: boolean; onClose: () => void }) => <article className="employee-detail"><header><div><span>Detalle operativo</span><h2 id="employee-dialog-title" data-dialog-initial tabIndex={-1}>{employee?.name ?? "Cargando empleado..."}</h2></div><button type="button" aria-label="Cerrar detalle" onClick={onClose} className="employee-dialog__native-close"><X size={20} aria-hidden="true" /></button></header>{loading || !employee ? <p role="status">Cargando detalle...</p> : <div className="employee-detail__body"><div className="employee-detail__states"><span className={`employee-status ${employee.is_active ? "is-active" : "is-inactive"}`}>Empleado {employee.is_active ? "activo" : "inactivo"}</span><span className={`employee-access ${crmAccess(employee).className}`}>{crmAccess(employee).label}</span></div><dl><div><dt>Sede</dt><dd>{branchLabel(employee)}</dd></div><div><dt>Cargo</dt><dd>{employee.job_title}</dd></div><div><dt>Especialidad</dt><dd>{employee.specialty ?? "Sin registrar"}</dd></div><div><dt>Teléfono</dt><dd>{employee.phone ?? "Sin registrar"}</dd></div><div><dt>Fecha de ingreso</dt><dd>{dateOnly(employee.hire_date)}</dd></div>{employee.user ? <><div><dt>Usuario CRM</dt><dd>{employee.user.name}</dd></div><div><dt>Email de acceso</dt><dd>{employee.user.email}</dd></div></> : null}</dl>{canViewSchedules || canViewLeaves || canViewTasks ? <section className="employee-detail__operation" aria-labelledby="employee-operation-title"><h3 id="employee-operation-title">Operación</h3><nav aria-label={`Operación de ${employee.name}`}>{canViewSchedules ? <a href={`/crm/schedules?employee_id=${employee.id}`}>Ver horario</a> : null}{canViewLeaves ? <a href={`/crm/leaves?employee_id=${employee.id}`}>Ver ausencias</a> : null}{canViewTasks ? <a href={`/crm/tasks?employee_id=${employee.id}`}>Ver tareas</a> : null}</nav></section> : null}<section><h3>Notas</h3><p>{employee.notes ?? "Sin notas."}</p></section></div>}</article>;

const CrmAccessForm = ({ employee, onBusy, onSaved, onClose }: { employee: Employee; onBusy: (busy: boolean) => void; onSaved: (employee: Employee) => void; onClose: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const lock = useRef(false);
  const fieldError = (field: string) => errors[field]?.[0];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    setError(""); setErrors({});
    if (password !== confirmation) { setErrors({ password_confirmation: ["Las contraseñas no coinciden."] }); return; }
    lock.current = true; setSaving(true); onBusy(true);
    try {
      const updated = await grantEmployeeCrmAccess(employee.id, { email: email.trim(), password, password_confirmation: confirmation });
      onSaved(updated);
    } catch (cause) {
      if (cause instanceof EmployeesApiError) setErrors(cause.errors);
      setError(cause instanceof Error ? cause.message : "No se pudo crear el acceso CRM.");
    } finally {
      lock.current = false; setSaving(false); onBusy(false);
    }
  };

  return <form className="employee-form employee-access-form" onSubmit={submit}><header><div><span>Acceso operativo</span><h2 id="employee-dialog-title" data-dialog-initial tabIndex={-1}>Dar acceso CRM</h2></div><button type="button" aria-label="Cerrar formulario" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header><div className="employee-form__body">
    <div className="employee-access-form__summary is-wide"><p><strong>Empleado:</strong> {employee.name}</p><p><strong>Cargo:</strong> {employee.job_title}</p><small>Se creará una cuenta de Usuario con acceso limitado al CRM y quedará vinculada a este empleado.</small></div>
    <label className="is-wide"><span>Email de acceso *</span><input autoFocus required type="email" autoComplete="email" value={email} disabled={saving} aria-invalid={Boolean(fieldError("email"))} aria-describedby={fieldError("email") ? "crm-access-email-error" : undefined} onChange={(event) => setEmail(event.target.value)} />{fieldError("email") ? <small id="crm-access-email-error" className="employee-field-error">{fieldError("email")}</small> : null}</label>
    <label><span>Contraseña *</span><input required type="password" autoComplete="new-password" value={password} disabled={saving} aria-invalid={Boolean(fieldError("password"))} aria-describedby={fieldError("password") ? "crm-access-password-error" : undefined} onChange={(event) => setPassword(event.target.value)} />{fieldError("password") ? <small id="crm-access-password-error" className="employee-field-error">{fieldError("password")}</small> : null}</label>
    <label><span>Confirmar contraseña *</span><input required type="password" autoComplete="new-password" value={confirmation} disabled={saving} aria-invalid={Boolean(fieldError("password_confirmation"))} aria-describedby={fieldError("password_confirmation") ? "crm-access-confirmation-error" : undefined} onChange={(event) => setConfirmation(event.target.value)} />{fieldError("password_confirmation") ? <small id="crm-access-confirmation-error" className="employee-field-error">{fieldError("password_confirmation")}</small> : null}</label>
    {error ? <p className="employee-form__error is-wide" role="alert">{error}</p> : null}
  </div><footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving}>{saving ? "Creando acceso..." : "Crear acceso CRM"}</button></footer></form>;
};

const EmployeeForm = ({ employee, canViewUsers, canViewBranches, branches, branchesLoading, branchesError, onBusy, onSaved, onClose }: { employee: Employee | null; canViewUsers: boolean; canViewBranches: boolean; branches: Branch[]; branchesLoading: boolean; branchesError: string; onBusy: (busy: boolean) => void; onSaved: (employee: Employee, created: boolean) => Promise<void>; onClose: () => void }) => {
  const creating = !employee;
  const [form, setForm] = useState<FormState>(() => employee ? formFromEmployee(employee) : { ...emptyForm });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const lock = useRef(false);

  useEffect(() => {
    if (!canViewUsers) return;
    const controller = new AbortController();
    setUsersLoading(true);
    getUsers({ page: 1, per_page: 100 }, controller.signal)
      .then((data) => setUsers(data.data))
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setUsersError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios."); })
      .finally(() => setUsersLoading(false));
    return () => controller.abort();
  }, [canViewUsers]);

  const clean = (value: string) => value.trim() || null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    setError(""); setErrors({});
    if (!form.name.trim() || !form.job_title.trim()) { setError("Nombre y cargo son obligatorios."); return; }
    const payload: EmployeePayload = {
      user_id: form.user_id ? Number(form.user_id) : null,
      branch_id: form.branch_id ? Number(form.branch_id) : null,
      name: form.name.trim(),
      phone: clean(form.phone),
      job_title: form.job_title.trim(),
      specialty: clean(form.specialty),
      notes: clean(form.notes),
      is_active: form.is_active,
      hire_date: form.hire_date || null,
    };
    lock.current = true; setSaving(true); onBusy(true);
    try {
      const saved = creating ? await createEmployee(payload) : await updateEmployee(employee.id, payload);
      await onSaved(saved, creating);
    } catch (cause) {
      if (cause instanceof EmployeesApiError) setErrors(cause.errors);
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el empleado.");
    } finally {
      lock.current = false; setSaving(false); onBusy(false);
    }
  };
  const fieldError = (field: string) => errors[field]?.[0] ? <small className="employee-field-error">{errors[field][0]}</small> : null;

  return <form className="employee-form" onSubmit={submit}><header><div><span>Equipo operativo</span><h2 id="employee-dialog-title" data-dialog-initial tabIndex={-1}>{creating ? "Registrar empleado" : "Editar empleado"}</h2></div><button type="button" aria-label="Cerrar formulario" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true" /></button></header><div className="employee-form__body">
    <label><span>Nombre *</span><input autoFocus required maxLength={160} value={form.name} disabled={saving} aria-invalid={Boolean(errors.name)} onChange={(event) => setForm({ ...form, name: event.target.value })} />{fieldError("name")}</label>
    {canViewBranches ? <label><span>Sede</span><select value={form.branch_id} disabled={saving || branchesLoading || Boolean(branchesError)} aria-invalid={Boolean(errors.branch_id)} onChange={(event) => setForm({ ...form, branch_id: event.target.value })}><option value="">Sin sede</option>{branches.filter((branch) => branch.is_active || branch.id === employee?.branch_id).map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.code}{branch.is_active ? "" : " · Inactiva"}</option>)}</select>{branchesLoading ? <small role="status">Cargando sedes...</small> : null}{branchesError ? <small className="employee-field-error" role="alert">{branchesError}</small> : null}{fieldError("branch_id")}<small>Solo las sedes activas están disponibles para nuevas asignaciones.</small></label> : null}
    <label><span>Cargo *</span><input required maxLength={120} placeholder="Técnico, instalador, asesor…" value={form.job_title} disabled={saving} aria-invalid={Boolean(errors.job_title)} onChange={(event) => setForm({ ...form, job_title: event.target.value })} />{fieldError("job_title")}</label>
    <label><span>Especialidad</span><input maxLength={160} placeholder="Polarizados, electrónica, audio…" value={form.specialty} disabled={saving} aria-invalid={Boolean(errors.specialty)} onChange={(event) => setForm({ ...form, specialty: event.target.value })} />{fieldError("specialty")}</label>
    <label><span>Teléfono</span><input type="tel" maxLength={40} value={form.phone} disabled={saving} aria-invalid={Boolean(errors.phone)} onChange={(event) => setForm({ ...form, phone: event.target.value })} />{fieldError("phone")}</label>
    <label><span>Fecha de ingreso</span><input type="date" value={form.hire_date} disabled={saving} aria-invalid={Boolean(errors.hire_date)} onChange={(event) => setForm({ ...form, hire_date: event.target.value })} />{fieldError("hire_date")}</label>
    <label className="is-wide"><span>Notas</span><textarea value={form.notes} disabled={saving} aria-invalid={Boolean(errors.notes)} onChange={(event) => setForm({ ...form, notes: event.target.value })} />{fieldError("notes")}</label>
    {canViewUsers ? <label className="is-wide"><span>Vincular usuario CRM existente</span><select value={form.user_id} disabled={saving || usersLoading} aria-invalid={Boolean(errors.user_id)} onChange={(event) => setForm({ ...form, user_id: event.target.value })}><option value="">Sin usuario CRM</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}{user.is_active ? "" : " · Inactivo"}</option>)}</select>{usersLoading ? <small role="status">Cargando usuarios...</small> : null}{usersError ? <small className="employee-field-error" role="alert">{usersError}</small> : null}{fieldError("user_id")}<small>Este selector reutiliza una cuenta ya creada. “Dar acceso CRM” crea una cuenta nueva. El nombre operativo permanece independiente.</small></label> : null}
    {form.user_id && users.find((user) => user.id === Number(form.user_id))?.is_active === false ? <p className="employee-user-warning is-wide" role="status">Este usuario no puede iniciar sesión actualmente. El empleado puede permanecer activo.</p> : null}
    <label className="employee-check is-wide"><input type="checkbox" checked={form.is_active} disabled={saving} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span>Empleado activo</span></label>
    {error ? <p className="employee-form__error is-wide" role="alert">{error}</p> : null}
  </div><footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : creating ? "Registrar empleado" : "Guardar cambios"}</button></footer></form>;
};
