import { createClient } from "@/lib/supabase/client";

type Channel = "emails" | "dms" | "calls";

/**
 * Upsert today's row, incrementing or decrementing one channel by `delta`.
 * Uses a Postgres function so the row is created on first touch and the
 * update is atomic. The check constraint on the table prevents going below 0.
 */
export async function adjustTodayCount(
  channel: Channel,
  delta: 1 | -1
): Promise<{ emails: number; dms: number; calls: number }> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc("adjust_outreach_count", {
    p_date: today,
    p_channel: channel,
    p_delta: delta,
  });

  if (error) throw error;
  return data;
}

/** Explicitly set all three counts for today (used by reset). */
export async function resetTodayCounts(): Promise<void> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("outreach_targets")
    .upsert({ date: today, emails: 0, dms: 0, calls: 0 }, { onConflict: "date" });
  if (error) throw error;
}
