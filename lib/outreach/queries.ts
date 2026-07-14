import { createClient } from "@/lib/supabase/server";
import { addDays, getMonthBounds, getWeekdayDates, getWeekStart, todayISO } from "./date";

export interface DailyOutreachLog {
  id: string;
  log_date: string;
  fb_leads_contacted: number;
  ig_dms: number;
  whatsapp_touches: number;
  us_cold_dials: number;
  conversations_held: number;
  booked_calls: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeekTrend {
  weekStart: string;
  bookedCalls: number;
}

/** Today's row (JHB calendar day). Null if nothing has been logged yet. */
export async function getTodayLog(): Promise<DailyOutreachLog | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_outreach_log")
    .select("*")
    .eq("log_date", todayISO())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Rows for the Mon..Fri of the week containing `dateStr` (defaults to today). */
export async function getWeekLogs(dateStr = todayISO()): Promise<DailyOutreachLog[]> {
  const supabase = await createClient();
  const weekdayDates = getWeekdayDates(dateStr);
  const { data, error } = await supabase
    .from("daily_outreach_log")
    .select("*")
    .in("log_date", weekdayDates)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Weekly booked_calls totals for the last `weeks` weeks (oldest first, includes the current week). */
export async function getBookedCallsTrend(weeks = 4): Promise<WeekTrend[]> {
  const supabase = await createClient();
  const today = todayISO();
  const earliestWeekStart = addDays(getWeekStart(today), -7 * (weeks - 1));

  const { data, error } = await supabase
    .from("daily_outreach_log")
    .select("log_date, booked_calls")
    .gte("log_date", earliestWeekStart)
    .lte("log_date", today)
    .order("log_date", { ascending: true });
  if (error) throw error;

  const totals = new Map<string, number>();
  for (let i = 0; i < weeks; i++) {
    totals.set(addDays(earliestWeekStart, 7 * i), 0);
  }
  for (const row of data ?? []) {
    const weekStart = getWeekStart(row.log_date);
    totals.set(weekStart, (totals.get(weekStart) ?? 0) + row.booked_calls);
  }

  return Array.from(totals.entries()).map(([weekStart, bookedCalls]) => ({ weekStart, bookedCalls }));
}

/** Leads whose most recent sold/closed_won call attempt falls within [start, end]. */
export async function getSignedClientsCount(start: string, end: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("count_signed_clients_in_range", {
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function getSignedClientsThisMonth(): Promise<number> {
  const { start, end } = getMonthBounds(todayISO());
  return getSignedClientsCount(start, end);
}
