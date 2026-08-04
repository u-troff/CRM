import { createClient } from "@/lib/supabase/client";
import { BoardKey, CustomFieldDefinition } from "@/types/custom";

// ── Row shape (snake_case, as returned by PostgREST) ─────────────────────────
type DbCustomFieldDefinition = {
  id: string;
  board_key: BoardKey;
  field_key: string;
  label: string;
  field_type: CustomFieldDefinition["fieldType"];
  select_options: unknown;
  display_order: number;
  created_at: string;
};

// select_options is jsonb, so it arrives as whatever was written. Anything that
// isn't an array of strings is treated as no options at all.
function toOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((o): o is string => typeof o === "string");
}

// ── Mapper ───────────────────────────────────────────────────────────────────
export function mapDefinition(
  row: DbCustomFieldDefinition
): CustomFieldDefinition {
  return {
    id: row.id,
    boardKey: row.board_key,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    selectOptions: toOptions(row.select_options),
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

// ── Fetchers ─────────────────────────────────────────────────────────────────
export async function fetchCustomFieldDefinitions(
  boardKey: BoardKey
): Promise<CustomFieldDefinition[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("custom_field_definitions")
    .select("*")
    .eq("board_key", boardKey)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapDefinition(r as DbCustomFieldDefinition));
}
