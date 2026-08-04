import { createClient } from "@/lib/supabase/client";
import {
  AdCampaign,
  AdCampaignInput,
  AdSpendEntry,
  AdSpendEntryInput,
} from "@/types/ads";
import { mapCampaign, mapSpendEntry } from "./queries";

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

// ── Campaigns ────────────────────────────────────────────────────────────────
function toCampaignRow(input: AdCampaignInput) {
  return {
    name: input.name.trim(),
    platform: input.platform.trim().toLowerCase(),
    vertical: nullify(input.vertical.toLowerCase()),
    market: nullify(input.market.toUpperCase()),
    currency: input.currency,
  };
}

export async function createAdCampaign(
  input: AdCampaignInput
): Promise<AdCampaign> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("ad_campaigns")
    .insert({ user_id: userId, ...toCampaignRow(input) })
    .select("*")
    .single();

  if (error) throw error;
  return mapCampaign(data);
}

export async function updateAdCampaign(
  id: string,
  input: AdCampaignInput
): Promise<AdCampaign> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ad_campaigns")
    .update(toCampaignRow(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapCampaign(data);
}

// Deleting a campaign cascades to its spend entries. Attributed leads are kept
// — their campaign_id is nulled by the FK, so the lead itself survives losing
// the campaign it came from.
export async function deleteAdCampaign(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
  if (error) throw error;
}

// ── Spend entries ────────────────────────────────────────────────────────────
function toSpendRow(input: AdSpendEntryInput) {
  return {
    period_start: input.periodStart,
    period_end: input.periodEnd,
    amount_spent: input.amountSpent,
    currency: input.currency,
    notes: nullify(input.notes),
  };
}

export async function createSpendEntry(
  campaignId: string,
  input: AdSpendEntryInput
): Promise<AdSpendEntry> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("ad_spend_entries")
    .insert({ user_id: userId, campaign_id: campaignId, ...toSpendRow(input) })
    .select("*")
    .single();

  if (error) throw error;
  return mapSpendEntry(data);
}

export async function updateSpendEntry(
  id: string,
  input: AdSpendEntryInput
): Promise<AdSpendEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ad_spend_entries")
    .update(toSpendRow(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapSpendEntry(data);
}

export async function deleteSpendEntry(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ad_spend_entries").delete().eq("id", id);
  if (error) throw error;
}
