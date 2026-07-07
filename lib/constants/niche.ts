import { Niche } from "@/types/lead";

export const ALL_NICHES: Niche[] = ["flooring", "remodeling", "plumbing"];

export const NICHE_META: Record<Niche, { label: string; color: string; bg: string }> = {
  flooring: { label: "Flooring", color: "var(--accent-cyan)", bg: "rgba(34,211,238,0.15)" },
  remodeling: { label: "Remodeling", color: "var(--accent-violet)", bg: "rgba(167,139,250,0.15)" },
  plumbing: { label: "Plumbing", color: "var(--accent-lime)", bg: "rgba(163,230,53,0.15)" },
};
