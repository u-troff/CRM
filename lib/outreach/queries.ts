import { createClient } from "@/lib/supabase/server";

export interface OutreachDay {
  id: string;
  date: string; // "YYYY-MM-DD"
  emails: number;
  dms: number;
  calls: number;
  created_at: string;
  updated_at: string;
}

/** Get today's row. Returns null if no row exists yet for today. */
export async function getTodayTargets(): Promise<OutreachDay | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("outreach_targets")
    .select("*")
    .eq("date", today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Get the last N days of history (including today), ordered newest first. */
export async function getTargetHistory(days = 30): Promise<OutreachDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outreach_targets")
    .select("*")
    .order("date", { ascending: false })
    .limit(days);
  if (error) throw error;
  return data ?? [];
}
