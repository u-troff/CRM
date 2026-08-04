// ── Custom field domain types ───────────────────────────────────────────────
// A board's extra fields: defined as rows in custom_field_definitions, stored
// as a jsonb blob on the board's own table.

export type CustomFieldType = "text" | "number" | "date" | "select" | "boolean";

// The boards that render custom fields. Adding one means adding its key here
// and rendering <CustomFieldInputs /> on that board — no schema change beyond
// the board's own `custom_fields` column.
export type BoardKey = "inbound_leads";

export interface CustomFieldDefinition {
  id: string;
  boardKey: BoardKey;
  fieldKey: string; // slug; the key inside the value blob
  label: string;
  fieldType: CustomFieldType;
  selectOptions: string[]; // empty unless fieldType is "select"
  displayOrder: number;
  createdAt: string;
}

export interface CustomFieldDefinitionInput {
  boardKey: BoardKey;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  selectOptions: string[];
  displayOrder: number;
}

// What a single custom field can hold. `null` is "not filled in" — the key may
// be absent from the blob entirely, which reads the same way.
export type CustomFieldValue = string | number | boolean | null;

export type CustomFieldValues = Record<string, CustomFieldValue>;
