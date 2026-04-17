import { LeadTier } from "@/types/lead";

export interface TierMeta {
  label: string;
  color: string;
  bgColor: string;
  priority: number; // lower = higher priority in queue
}

export const TIER_META: Record<LeadTier, TierMeta> = {
  "TIER 1": {
    label: "T1",
    color: "#a3e635",
    bgColor: "rgba(163,230,53,0.15)",
    priority: 1,
  },
  "TIER 2": {
    label: "T2",
    color: "#fbbf24",
    bgColor: "rgba(251,191,36,0.15)",
    priority: 2,
  },
  "TIER 3": {
    label: "T3",
    color: "#737373",
    bgColor: "rgba(115,115,115,0.15)",
    priority: 3,
  },
};

export const ALL_TIERS: LeadTier[] = ["TIER 1", "TIER 2", "TIER 3"];
