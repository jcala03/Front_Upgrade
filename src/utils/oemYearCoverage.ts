import type { VehicleMultimediaSystemPivot } from "../types/vehicle";

/** A recorded interval restricts a filter; missing bounds do not certify fitment. */
export const yearWithinOemCoverage = (year: number, coverage?: VehicleMultimediaSystemPivot | null): boolean =>
  (coverage?.year_from == null || year >= coverage.year_from) &&
  (coverage?.year_to == null || year <= coverage.year_to);
