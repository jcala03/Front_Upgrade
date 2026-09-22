import type { DashboardSalesPoint } from "../../../types/dashboard";
import { formatCurrency } from "../../../utils/formatCurrency";

type SalesChartProps = { points: DashboardSalesPoint[] };

const shortMoney = (value: number) => {
  if (value >= 1_000_000) return `$${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value / 1_000_000)} M`;
  if (value >= 1_000) return `$${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value / 1_000)} mil`;
  return `$${value}`;
};

const dateOnly = (value: string) => new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
}).format(new Date(`${value}T00:00:00`));

export const SalesChart = ({ points }: SalesChartProps) => {
  const width = 760;
  const height = 260;
  const padding = { top: 18, right: 16, bottom: 38, left: 68 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(...points.map((point) => Number(point.total) || 0), 0);
  const scaleMaximum = maximum > 0 ? maximum : 1;
  const x = (index: number) => padding.left + (points.length > 1 ? index / (points.length - 1) : 0) * chartWidth;
  const y = (value: number) => padding.top + chartHeight - (value / scaleMaximum) * chartHeight;
  const path = points.map((point, index) => `${index ? "L" : "M"} ${x(index).toFixed(2)} ${y(point.total).toFixed(2)}`).join(" ");
  const area = points.length ? `${path} L ${x(points.length - 1)} ${padding.top + chartHeight} L ${x(0)} ${padding.top + chartHeight} Z` : "";
  const ticks = [1, 0.5, 0];
  const labelIndexes = points.length ? [0, 7, 14, 21, points.length - 1] : [];
  const hasSales = maximum > 0;

  return (
    <div className="dashboard-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="sales-chart-title sales-chart-description" preserveAspectRatio="xMidYMid meet">
        <title id="sales-chart-title">Ventas confirmadas de los últimos 30 días</title>
        <desc id="sales-chart-description">
          {hasSales
            ? `El mayor total diario fue ${formatCurrency(maximum)}. El periodo contiene ${points.reduce((sum, point) => sum + point.orders_count, 0)} ventas.`
            : "No hubo ventas confirmadas durante los últimos 30 días."}
        </desc>
        {ticks.map((tick) => {
          const tickY = padding.top + chartHeight * (1 - tick);
          return <g key={tick}><line className="dashboard-chart__grid" x1={padding.left} x2={width - padding.right} y1={tickY} y2={tickY} /><text className="dashboard-chart__axis" x={padding.left - 12} y={tickY + 4} textAnchor="end">{shortMoney(scaleMaximum * tick)}</text></g>;
        })}
        {area ? <path className="dashboard-chart__area" d={area} /> : null}
        {path ? <path className="dashboard-chart__line" d={path} /> : null}
        {labelIndexes.map((index) => points[index] ? <text className="dashboard-chart__axis" key={`${points[index].date}-${index}`} x={x(index)} y={height - 12} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}>{dateOnly(points[index].date)}</text> : null)}
      </svg>
      {!hasSales ? <p className="dashboard-chart__empty">Todavía no hay ventas confirmadas en este periodo.</p> : null}
    </div>
  );
};
