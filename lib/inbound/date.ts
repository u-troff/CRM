// Follow-up date helpers for the inbound board.

// A follow-up is "due" when its timestamp is at or before the end of today
// (i.e. today or overdue).
export function isFollowupDue(iso: string | null): boolean {
  if (!iso) return false;
  const due = new Date(iso);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return due.getTime() <= endOfToday.getTime();
}

export function isFollowupOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const due = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return due.getTime() < startOfToday.getTime();
}

// Add whole days to a base ISO timestamp, returning an ISO string.
export function addDays(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Short, human date for cards / rows (e.g. "23 Jul").
export function formatFollowupDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// Convert a <input type="date"> value (YYYY-MM-DD) to an ISO timestamp at
// local noon, or null when empty.
export function dateInputToIso(value: string): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

// Convert an ISO timestamp to a <input type="date"> value (YYYY-MM-DD).
export function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
