/** A form draft is not a persisted number: an empty input must stay empty. */
export type NumericDraft = number | string;

export const parseNumericDraft = (value: NumericDraft): number | null => {
  if (typeof value === "string" && (!value.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Zero is only a display placeholder in an unfinished, non-persisted preview. */
export const numericPreview = (value: NumericDraft): number => parseNumericDraft(value) ?? 0;

/** Call only after validation; never silently serialize an invalid draft as zero. */
export const numericPayload = (value: NumericDraft): number => {
  const parsed = parseNumericDraft(value);
  if (parsed === null) throw new Error("Completa el campo con un número válido.");
  return parsed;
};

/** Also protects explicit submit events and forms that use noValidate. */
export const validateNumericInputs = (form: HTMLFormElement): boolean => {
  for (const input of form.querySelectorAll<HTMLInputElement>('input[type="number"]')) {
    input.setCustomValidity("");
    if (input.disabled) continue;
    if (input.validity.badInput || (input.value !== "" && parseNumericDraft(input.value) === null)) {
      input.setCustomValidity("Ingresa un número válido y finito.");
    } else if (input.required && input.value === "") {
      input.setCustomValidity("Completa este campo numérico.");
    }
    // Clear our submit-time message on the next edit, including invalid edits.
    input.addEventListener("input", () => input.setCustomValidity(""), { once: true });
  }
  return form.reportValidity();
};
