import { WEEKLY_BOOKED_CALLS_TARGET } from "./constants";

export interface PacingStatus {
  label: "On Track" | "Behind";
  color: string;
}

/**
 * Mid-week pacing check for the weekly booked-calls target. Expects
 * proportionally less progress early in the week so Monday morning
 * doesn't read as "Behind" before there's been a chance to book anything.
 */
export function weeklyBookedCallsPacing(weekSum: number, weekdayIdx: number): PacingStatus {
  if (weekSum >= WEEKLY_BOOKED_CALLS_TARGET.min) return { label: "On Track", color: "var(--accent-lime)" };

  const daysElapsed = Math.min(5, weekdayIdx + 1);
  const expectedByNow = Math.ceil((WEEKLY_BOOKED_CALLS_TARGET.min * daysElapsed) / 5);
  if (weekSum >= expectedByNow) return { label: "On Track", color: "var(--accent-amber)" };

  return { label: "Behind", color: "var(--accent-red)" };
}

export function targetColor(value: number, target: { min: number; max: number }): string {
  if (value < target.min) return "var(--accent-red)";
  if (value <= target.max) return "var(--accent-lime)";
  return "var(--accent-emerald)"; // exceeded the top of the range
}
