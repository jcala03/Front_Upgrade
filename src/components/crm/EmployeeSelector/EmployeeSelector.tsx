import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getEmployee, getEmployees } from "../../../api/employees";
import type { Employee } from "../../../types/employee";
import "./EmployeeSelector.css";

type EmployeeSelectorProps = {
  value: number | null;
  onChange: (employee: Employee | null) => void;
  onResolved?: (employee: Employee | null) => void;
  allowAll?: boolean;
  disabled?: boolean;
  label?: string;
  validationError?: string;
  validationErrorId?: string;
};

export const EmployeeSelector = ({
  value,
  onChange,
  onResolved,
  allowAll = false,
  disabled = false,
  label = "Empleado",
  validationError,
  validationErrorId = "employee-selector-validation-error",
}: EmployeeSelectorProps) => {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++requestId.current;
    const timeout = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const result = await getEmployees({ search: search.trim() || undefined, sort: "name", direction: "asc", page: 1, per_page: 50 }, controller.signal);
        let rows = result.data;
        if (value && !rows.some((employee) => employee.id === value)) {
          rows = [await getEmployee(value, controller.signal), ...rows];
        }
        if (request === requestId.current) {
          const uniqueRows = rows.filter((employee, index, all) => all.findIndex((candidate) => candidate.id === employee.id) === index);
          setEmployees(uniqueRows);
          onResolved?.(value ? uniqueRows.find((employee) => employee.id === value) ?? null : null);
        }
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError") && request === requestId.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los empleados.");
      } finally { if (request === requestId.current) setLoading(false); }
    }, search ? 300 : 0);
    return () => { window.clearTimeout(timeout); controller.abort(); requestId.current += 1; };
  }, [onResolved, search, value]);

  return <div className="crm-employee-selector">
    <label><span>{label}</span><div className="crm-employee-selector__search"><Search size={16} aria-hidden="true" /><input type="search" value={search} disabled={disabled} placeholder="Buscar por nombre o cargo" onChange={(event) => setSearch(event.target.value)} /></div></label>
    <label className="crm-employee-selector__select"><span className="sr-only">Seleccionar {label.toLowerCase()}</span><select value={value ?? ""} disabled={disabled || loading} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? validationErrorId : undefined} onChange={(event) => { const id = Number(event.target.value); onChange(employees.find((employee) => employee.id === id) ?? null); }}>
      <option value="">{allowAll ? "Todos los empleados" : "Selecciona un empleado"}</option>
      {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.job_title}{employee.branch ? ` · ${employee.branch.name}` : ""}{employee.is_active ? "" : " · Inactivo"}</option>)}
    </select></label>
    {validationError ? <small id={validationErrorId} className="crm-employee-selector__error" role="alert">{validationError}</small> : null}
    {loading ? <small role="status">Cargando empleados...</small> : null}
    {error ? <small className="crm-employee-selector__error" role="alert">{error}</small> : null}
  </div>;
};
