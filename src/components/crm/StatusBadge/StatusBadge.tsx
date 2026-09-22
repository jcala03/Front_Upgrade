import type { ReactNode } from "react";
import "./StatusBadge.css";

export type StatusBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export const StatusBadge = ({ label, tone = "neutral", icon }: { label: string; tone?: StatusBadgeTone; icon?: ReactNode }) => (
  <span className={`crm-status-badge crm-status-badge--${tone}`}>
    {icon ? <span className="crm-status-badge__icon" aria-hidden="true">{icon}</span> : null}
    <span>{label}</span>
  </span>
);
