import geography from "../../data/shippingGeography.json";

// Reference data only: this catalog never asserts delivery coverage or a postal code.
export const shippingCountries = geography.countries;
export const colombianDepartments = geography.departments;
export const normalizePlace = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]/g, "");

export function colombianDepartment(value: string) {
  const key = normalizePlace(value);
  return colombianDepartments.find(item => [item.id, item.name, item.shippingName, item.shippingCode]
    .some(candidate => normalizePlace(candidate) === key));
}

export function colombianCityValue(id: string, name: string) {
  // Envia resolves the city inside the selected department, not a five-digit DANE code.
  return id === "11001" ? "Bogotá" : name;
}

export function colombianCity(department: ReturnType<typeof colombianDepartment>, value: string) {
  const key = normalizePlace(value);
  return department?.cities.find(([id, name]) => id === value
    || normalizePlace(name) === key || normalizePlace(colombianCityValue(id, name)) === key);
}

export const streetTypes = ["Calle", "Carrera", "Avenida", "Avenida Calle", "Avenida Carrera", "Diagonal", "Transversal", "Circular", "Autopista", "Carretera", "Vía"] as const;
export type StreetParts = { type: string; main: string; cross: string; door: string };
export const emptyStreet = (): StreetParts => ({ type: "", main: "", cross: "", door: "" });
const clean = (value: string) => value.trim().replace(/\s+/g, " ");

export function composeStreet(parts: StreetParts): string | null {
  const { type, main, cross, door } = Object.fromEntries(Object.entries(parts).map(([key, value]) => [key, clean(value)])) as StreetParts;
  if (!(streetTypes as readonly string[]).includes(type) || !main || !cross || !door) return null;
  if (main.length > 80 || cross.length > 60 || door.length > 20
    || [main, cross, door].some(value => /[#\r\n]/.test(value))
    || !/^\d+[a-zA-Z]?$/.test(door)) return null;
  const address = `${type} ${main} # ${cross} - ${door}`;
  return address.length <= 220 ? address : null;
}

export function parseStreet(address: string): StreetParts | null {
  const match = clean(address).match(/^(avenida\s+carrera|avenida\s+calle|av\.?\s+carrera|av\.?\s+calle|carrera|cra\.?|cr\.?|calle|cl\.?|avenida|av\.?|diagonal|dg\.?|transversal|tv\.?|circular|autopista|carretera|v[ií]a)\s+(.+?)\s*#\s*(.+?)\s*-\s*(\d+[a-z]?)$/i);
  if (!match) return null;
  const aliases: Record<string, string> = { cra: "Carrera", cr: "Carrera", cl: "Calle", av: "Avenida", dg: "Diagonal", tv: "Transversal", avcarrera: "Avenida Carrera", avcalle: "Avenida Calle" };
  const key = normalizePlace(match[1]);
  const type = aliases[key] ?? streetTypes.find(value => normalizePlace(value) === key);
  const parts = { type: type ?? "", main: match[2].trim(), cross: match[3].trim(), door: match[4].trim() };
  return composeStreet(parts) ? parts : null;
}
