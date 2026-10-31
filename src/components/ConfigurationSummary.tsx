import { configurationSummary, type ConfigurationContext } from "../types/productConfiguration";
import "./ConfigurationSummary.css";

export function ConfigurationSummary({ context }: { context?: ConfigurationContext | null }) {
  const text = configurationSummary(context);
  return text ? <p className="configuration-summary">{text}</p> : null;
}
