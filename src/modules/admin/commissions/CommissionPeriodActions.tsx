import { commissionMonth } from "./commissionUtils";

export const CommissionPeriodActions = ({ onSelect }: {
  onSelect: (period: { from: string; to: string }) => void;
}) => <div className="commission-period-note commission-period-actions" role="group" aria-label="Cambiar período de comisiones">
  <button type="button" onClick={() => onSelect(commissionMonth(-1))}>Mes anterior</button>
  <button type="button" onClick={() => onSelect(commissionMonth())}>Este mes</button>
  <span>Por defecto se consulta el mes actual. Puedes consultar períodos anteriores sin cambiar los registros.</span>
</div>;
