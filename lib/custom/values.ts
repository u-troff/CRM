import {
  CustomFieldDefinition,
  CustomFieldType,
  CustomFieldValue,
  CustomFieldValues,
} from "@/types/custom";

// A jsonb blob can't be type-checked by Postgres the way a column can, so every
// value crosses this module on the way in and on the way out. Reads are
// defensive: a definition whose type changed after values were saved will find
// the old shape in the blob, and coercing beats crashing.

export function slugifyFieldKey(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  // The column's check constraint requires a leading letter.
  return /^[a-z]/.test(slug) ? slug : slug ? `f_${slug}` : "";
}

export function isValidFieldKey(key: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(key);
}

// Text typed into an input (or a checkbox's state) → what gets stored. Blank
// means "not filled in" for every type, so clearing a field removes its value
// rather than storing an empty string.
export function coerceValue(
  type: CustomFieldType,
  raw: string | boolean
): CustomFieldValue {
  if (type === "boolean") return raw === true || raw === "true";
  if (typeof raw !== "string" || raw.trim() === "") return null;

  if (type === "number") {
    const n = Number(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return raw.trim();
}

// Stored value → the string an <input>/<select> wants. Booleans are handled by
// the checkbox itself and never come through here.
export function toInputValue(value: CustomFieldValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "";
  return String(value);
}

export function isChecked(value: CustomFieldValue): boolean {
  return value === true;
}

// Reading the blob off a row: unknown keys are dropped and each value is pulled
// back to the type its definition claims, so the form never receives, say, a
// number where it expects a checkbox.
export function readValues(
  definitions: CustomFieldDefinition[],
  blob: unknown
): CustomFieldValues {
  const source =
    blob && typeof blob === "object" && !Array.isArray(blob)
      ? (blob as Record<string, unknown>)
      : {};

  const values: CustomFieldValues = {};
  for (const definition of definitions) {
    const raw = source[definition.fieldKey];
    if (raw === null || raw === undefined) {
      values[definition.fieldKey] = null;
      continue;
    }
    if (definition.fieldType === "boolean") {
      values[definition.fieldKey] = raw === true;
    } else if (definition.fieldType === "number") {
      const n = typeof raw === "number" ? raw : Number(raw);
      values[definition.fieldKey] = Number.isFinite(n) ? n : null;
    } else {
      values[definition.fieldKey] = typeof raw === "string" ? raw : String(raw);
    }
  }
  return values;
}

// Writing the blob back: nulls are dropped so an untouched field doesn't leave
// a `"notes_2": null` behind, and a deleted definition's leftovers are carried
// through untouched rather than silently destroyed — removing a field from the
// UI shouldn't quietly delete data that could be wanted again.
export function writeValues(
  definitions: CustomFieldDefinition[],
  existingBlob: unknown,
  values: CustomFieldValues
): Record<string, CustomFieldValue> {
  const source =
    existingBlob && typeof existingBlob === "object" && !Array.isArray(existingBlob)
      ? (existingBlob as Record<string, CustomFieldValue>)
      : {};

  const blob: Record<string, CustomFieldValue> = { ...source };
  for (const definition of definitions) {
    const value = values[definition.fieldKey] ?? null;
    if (value === null || value === "") delete blob[definition.fieldKey];
    else blob[definition.fieldKey] = value;
  }
  return blob;
}
