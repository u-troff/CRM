import { Lead, CallAttempt, CallStatus } from "@/types/lead";
import { storage } from "@/lib/storage";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Polyfill for SSR edge cases
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createLead(partial: Omit<Lead, "id" | "createdAt" | "updatedAt" | "history" | "currentStatus">): Lead {
  const now = Date.now();
  return {
    ...partial,
    id: uuid(),
    currentStatus: "new",
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveLead(lead: Lead): Promise<void> {
  const updated = { ...lead, updatedAt: Date.now() };
  await storage.saveLead(updated);
}

export async function deleteLead(id: string): Promise<void> {
  await storage.deleteLead(id);
}

export async function logCall(
  lead: Lead,
  status: CallStatus,
  notes: string,
  durationSeconds?: number
): Promise<Lead> {
  const attempt: CallAttempt = {
    id: uuid(),
    timestamp: Date.now(),
    status,
    notes,
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
  };

  const updated: Lead = {
    ...lead,
    currentStatus: status,
    history: [...lead.history, attempt],
    updatedAt: Date.now(),
  };

  await storage.saveLead(updated);
  return updated;
}

export async function addManualAttempt(
  lead: Lead,
  status: CallStatus,
  notes: string,
  timestamp: number
): Promise<Lead> {
  const attempt: CallAttempt = {
    id: uuid(),
    timestamp,
    status,
    notes,
  };

  // Sort history by timestamp after adding
  const history = [...lead.history, attempt].sort((a, b) => a.timestamp - b.timestamp);

  const updated: Lead = {
    ...lead,
    currentStatus: status,
    history,
    updatedAt: Date.now(),
  };

  await storage.saveLead(updated);
  return updated;
}

export async function updateLeadField<K extends keyof Lead>(
  lead: Lead,
  field: K,
  value: Lead[K]
): Promise<Lead> {
  const updated: Lead = { ...lead, [field]: value, updatedAt: Date.now() };
  await storage.saveLead(updated);
  return updated;
}

export async function upsertLeads(incoming: Lead[]): Promise<{ added: number; updated: number }> {
  const existing = await storage.getLeads();

  let added = 0;
  let updated = 0;

  const merged = [...existing];

  for (const lead of incoming) {
    // Dedup: match on phoneRaw OR (businessName + city)
    const idx = merged.findIndex(
      (e) =>
        (lead.phone && e.phone && e.phone === lead.phone) ||
        (e.businessName.toLowerCase() === lead.businessName.toLowerCase() &&
          e.city.toLowerCase() === lead.city.toLowerCase())
    );

    if (idx >= 0) {
      // Update existing — preserve history, merge new fields
      merged[idx] = {
        ...merged[idx],
        ...lead,
        id: merged[idx].id, // keep original id
        history: merged[idx].history, // keep existing call history
        currentStatus: merged[idx].currentStatus, // keep existing status
        updatedAt: Date.now(),
      };
      updated++;
    } else {
      merged.push(lead);
      added++;
    }
  }

  await storage.saveLeads(merged);
  return { added, updated };
}
