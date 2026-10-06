import { useState } from "react";
import { transformationBaseImage, transformationVisuals } from "../../../data/transformationVisuals";

export const TransformationVehicle = ({ activeId, title }: { activeId: string; title: string }) => {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const selected = transformationVisuals.find((visual) => visual.id === activeId);
  const selectedSource = selected && !failedSources.includes(selected.src) ? selected.src : transformationBaseImage;
  // Deduplicate the temporary base: switching steps must not fake a visual change.
  const sources = [...new Set([transformationBaseImage, ...transformationVisuals.map((visual) => visual.src)])];

  return sources.map((src) => <img
    key={src}
    className={`transformation__vehicle ${src === selectedSource ? "is-active" : ""}`}
    src={src}
    alt={src === transformationBaseImage ? "BMW blanco visto de perfil lateral; imagen base de referencia" : `BMW blanco: ${title}`}
    aria-hidden={src !== selectedSource}
    width={3840}
    height={2160}
    loading="eager"
    decoding="async"
    fetchPriority="low"
    onError={() => setFailedSources((current) => current.includes(src) ? current : [...current, src])}
  />);
};
