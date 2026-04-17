import { LeadTier } from "@/types/lead";
import { TIER_META } from "@/lib/constants/tiers";

export default function TierBadge({ tier }: { tier: LeadTier }) {
  const meta = TIER_META[tier];
  return (
    <span
      className="tier-badge"
      style={{ color: meta.color, borderColor: meta.color }}
      title={tier}
    >
      {meta.label}
    </span>
  );
}
