import { createClient } from "@/lib/supabase/client";
import type { ChannelKey } from "./constants";

export type DailyLogPatch = Partial<Record<ChannelKey, number>> & { notes?: string | null };

/**
 * Upsert today's row with only the fields present in `patch`. Supabase/PostgREST
 * only SETs columns present in the payload on conflict, so unrelated counters
 * (and the row's other channels) are left untouched.
 */
export async function upsertDailyLog(logDate: string, patch: DailyLogPatch) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_outreach_log")
    .upsert({ log_date: logDate, ...patch }, { onConflict: "log_date" })
    .select()
    .single();
  if (error) throw error;
  return data;
}
