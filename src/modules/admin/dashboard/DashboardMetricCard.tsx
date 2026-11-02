import type { ReactNode } from "react";

export const DashboardMetricCard = ({ label, value, detail, icon }: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: ReactNode;
}) => <article className="dashboard-metric">
  <div className="dashboard-metric__heading"><span>{label}</span>{icon}</div>
  <strong>{value}</strong>
  <small>{detail}</small>
</article>;
