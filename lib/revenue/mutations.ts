import { createClient } from "@/lib/supabase/client";
import { ClientRevenueEntry, ClientRevenueEntryInput } from "@/types/revenue";
import { mapRevenueEntry } from "./queries";

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// Trim empty strings down to null so optional columns stay clean.
function nullify(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toRow(input: ClientRevenueEntryInput) {
  return {
    entry_type: input.entryType,
    description: nullify(input.description),
    amount: input.amount,
    currency: input.currency,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    expected_date: input.expectedDate,
    collected_date: input.collectedDate,
  };
}

export async function createRevenueEntry(
  leadId: string,
  input: ClientRevenueEntryInput
): Promise<ClientRevenueEntry> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("client_revenue_entries")
    .insert({ user_id: userId, lead_id: leadId, ...toRow(input) })
    .select("*")
    .single();

  if (error) throw error;
  return mapRevenueEntry(data);
}

export async function updateRevenueEntry(
  id: string,
  input: ClientRevenueEntryInput
): Promise<ClientRevenueEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_revenue_entries")
    .update(toRow(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapRevenueEntry(data);
}

// The one edit that happens often enough to deserve its own path: money landed
// (or a mistake needs undoing). Passing null puts the entry back to expected.
export async function setRevenueCollected(
  id: string,
  collectedDate: string | null
): Promise<ClientRevenueEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_revenue_entries")
    .update({ collected_date: collectedDate })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapRevenueEntry(data);
}

export async function deleteRevenueEntry(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("client_revenue_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
