import { Lead, CallStatus } from "@/types/lead";
import { EXCLUDED_FROM_QUEUE } from "@/lib/constants/statuses";

// ─── Queue Priority ────────────────────────────────────────────────────────────
// Sort order:
// 1. Tier ascending (TIER 1 first)
// 2. Status priority (new=0, callback=0, no_answer=1, voicemail=2, gatekeeper=3, everything else=99)
// 3. Within same tier+status, sort by reviewCount descending

const STATUS_PRIORITY: Record<CallStatus, number> = {
  new: 0,
  callback: 0,
  no_answer: 1,
  voicemail: 2,
  gatekeeper: 3,
  nurture: 10,
  discovery_booked: 99,
  not_interested: 99,
  wrong_number: 99,
  dnc: 99,
  closed_won: 99,
  closed_lost: 99,
};

const TIER_PRIORITY: Record<string, number> = {
  "TIER 1": 1,
  "TIER 2": 2,
  "TIER 3": 3,
};

export function buildDialQueue(leads: Lead[]): Lead[] {
  return leads
    .filter((lead) => {
      // Exclude if phone is missing
      if (!lead.phone) return false;
      // Exclude terminal statuses
      if (EXCLUDED_FROM_QUEUE.includes(lead.currentStatus)) return false;
      return true;
    })
    .sort((a, b) => {
      // 1. Tier
      const tierDiff = (TIER_PRIORITY[a.tier] ?? 99) - (TIER_PRIORITY[b.tier] ?? 99);
      if (tierDiff !== 0) return tierDiff;

      // 2. Status priority
      const statusDiff =
        (STATUS_PRIORITY[a.currentStatus] ?? 99) -
        (STATUS_PRIORITY[b.currentStatus] ?? 99);
      if (statusDiff !== 0) return statusDiff;

      // 3. Review count descending (higher social proof first)
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });
}

export function getQueueIndex(queue: Lead[], leadId: string): number {
  return queue.findIndex((l) => l.id === leadId);
}

export function getNextInQueue(queue: Lead[], currentId: string): Lead | null {
  const idx = getQueueIndex(queue, currentId);
  if (idx < 0 || idx >= queue.length - 1) return null;
  return queue[idx + 1];
}

export function getPrevInQueue(queue: Lead[], currentId: string): Lead | null {
  const idx = getQueueIndex(queue, currentId);
  if (idx <= 0) return null;
  return queue[idx - 1];
}
