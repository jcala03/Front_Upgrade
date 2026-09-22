import type { AvailabilityReasonCode, EmployeeLeaveStatus, EmployeeLeaveType } from "../types/workforce";
import type { TaskPriority, TaskStatus } from "../types/task";
import type { AppointmentStatus } from "../types/appointment";
import type { GoalEffectiveStatus, GoalSource } from "../types/goal";

export const availabilityReasonLabel = (code: AvailabilityReasonCode) => ({
  inactive_employee: "Empleado inactivo",
  outside_work_schedule: "Fuera de su horario laboral",
  no_work_schedule: "No tiene horario configurado",
  approved_leave: "No disponible por ausencia",
  task_overlap: "Tiene una tarea programada",
  appointment_overlap: "Tiene una cita programada",
})[code];

export const taskPriorityLabel = (value: TaskPriority) => ({ low: "Baja", normal: "Normal", high: "Alta", urgent: "Urgente" })[value];
export const taskStatusLabel = (value: TaskStatus) => ({ pending: "Pendiente", in_progress: "En progreso", completed: "Completada", cancelled: "Cancelada" })[value];
export const appointmentStatusLabel = (value: AppointmentStatus) => ({ requested: "Solicitada", confirmed: "Confirmada", in_progress: "En progreso", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió" })[value];
export const appointmentSourceLabel = (value: "crm" | "public_web") => ({ crm: "CRM", public_web: "Web pública" })[value];
export const goalStatusLabel = (value: GoalEffectiveStatus) => ({ active: "Activa", completed: "Completada", cancelled: "Cancelada", expired: "Vencida" })[value];
export const goalSourceLabel = (value: GoalSource) => value === "assigned" ? "Asignada" : "Personal";
export const leaveTypeLabel = (value: EmployeeLeaveType) => ({ vacation: "Vacaciones", permission: "Permiso", sick_leave: "Incapacidad", absence: "Ausencia", other: "Otra" })[value];
export const leaveStatusLabel = (value: EmployeeLeaveStatus) => value === "approved" ? "Aprobada" : "Cancelada";

export const decimalNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
