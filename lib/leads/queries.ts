import { Lead, CallStatus, LeadTier } from "@/types/lead";

export type SortField =
  | "businessName"
  | "tier"
  | "rating"
  | "reviewCount"
  | "currentStatus"
  | "callCount"
  | "lastContact"
  | "city";

export type SortDir = "asc" | "desc";

export interface FilterOptions {
  search?: string;
  tier?: LeadTier | "all";
  status?: CallStatus | "all";
  isFranchise?: boolean | "all";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCallCount(lead: Lead): number {
  return lead.history.length;
}

export function getLastContact(lead: Lead): number | null {
  if (lead.history.length === 0) return null;
  return Math.max(...lead.history.map((a) => a.timestamp));
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function filterLeads(leads: Lead[], options: FilterOptions): Lead[] {
  return leads.filter((lead) => {
    // Search
    if (options.search) {
      const q = options.search.toLowerCase();
      const haystack = [
        lead.businessName,
        lead.ownerName,
        lead.phone,
        lead.phoneRaw,
        lead.websiteNotes,
        lead.city,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // Tier filter
    if (options.tier && options.tier !== "all") {
      if (lead.tier !== options.tier) return false;
    }

    // Status filter
    if (options.status && options.status !== "all") {
      if (lead.currentStatus !== options.status) return false;
    }

    // Franchise filter
    if (options.isFranchise !== undefined && options.isFranchise !== "all") {
      if (lead.isFranchise !== options.isFranchise) return false;
    }

    return true;
  });
}

export function sortLeads(
  leads: Lead[],
  field: SortField,
  dir: SortDir
): Lead[] {
  const sorted = [...leads].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "businessName":
        cmp = a.businessName.localeCompare(b.businessName);
        break;
      case "tier": {
        const tierOrder: Record<LeadTier, number> = {
          "TIER 1": 1,
          "TIER 2": 2,
          "TIER 3": 3,
        };
        cmp = tierOrder[a.tier] - tierOrder[b.tier];
        break;
      }
      case "rating":
        cmp = (a.rating ?? 0) - (b.rating ?? 0);
        break;
      case "reviewCount":
        cmp = (a.reviewCount ?? 0) - (b.reviewCount ?? 0);
        break;
      case "currentStatus":
        cmp = a.currentStatus.localeCompare(b.currentStatus);
        break;
      case "callCount":
        cmp = getCallCount(a) - getCallCount(b);
        break;
      case "lastContact": {
        const la = getLastContact(a) ?? 0;
        const lb = getLastContact(b) ?? 0;
        cmp = la - lb;
        break;
      }
      case "city":
        cmp = a.city.localeCompare(b.city);
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function getLeadById(leads: Lead[], id: string): Lead | undefined {
  return leads.find((l) => l.id === id);
}
