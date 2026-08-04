import { createClient } from "@/lib/supabase/client";
import {
  CustomFieldDefinition,
  CustomFieldDefinitionInput,
} from "@/types/custom";
import { mapDefinition } from "./queries";

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function toRow(input: CustomFieldDefinitionInput) {
  return {
    board_key: input.boardKey,
    field_key: input.fieldKey,
    label: input.label.trim(),
    field_type: input.fieldType,
    // Options only mean anything for a select; storing them on a text field
    // would leave a trap for whoever changes its type later.
    select_options: input.fieldType === "select" ? input.selectOptions : null,
    display_order: input.displayOrder,
  };
}

export async function createCustomField(
  input: CustomFieldDefinitionInput
): Promise<CustomFieldDefinition> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert({ user_id: userId, ...toRow(input) })
    .select("*")
    .single();

  if (error) throw error;
  return mapDefinition(data);
}

// `field_key` is editable, but changing it orphans every value already stored
// under the old key — the manager warns before letting it through.
export async function updateCustomField(
  id: string,
  input: CustomFieldDefinitionInput
): Promise<CustomFieldDefinition> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("custom_field_definitions")
    .update(toRow(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapDefinition(data);
}

// Deletes the definition only. Values already written under its key stay in
// each row's blob, so re-adding a field with the same key brings them back.
export async function deleteCustomField(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("custom_field_definitions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Persist a new ordering (writes each definition's display_order).
export async function reorderCustomFields(
  ordered: { id: string; displayOrder: number }[]
): Promise<void> {
  const supabase = createClient();
  for (const { id, displayOrder } of ordered) {
    const { error } = await supabase
      .from("custom_field_definitions")
      .update({ display_order: displayOrder })
      .eq("id", id);
    if (error) throw error;
  }
}
