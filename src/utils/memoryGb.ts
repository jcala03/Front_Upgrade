/** Structured GB only; never infer memory from a label or product-level value. */
export const isValidMemoryGb = (value: unknown): boolean => {
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return false;
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) && number > 0 && number <= 9999999999.99;
};
