import { EnrichmentNiche } from "@/types/enrichment";

const NICHE_META: Record<EnrichmentNiche, { label: string; color: string; bg: string }> = {
  flooring: { label: "Flooring", color: "var(--accent-cyan)", bg: "rgba(34,211,238,0.15)" },
  remodeling: { label: "Remodeling", color: "var(--accent-violet)", bg: "rgba(167,139,250,0.15)" },
};

export default function NichePill({ niche }: { niche: EnrichmentNiche | null }) {
  if (!niche) return <span style={{ color: "var(--text-faint)" }}>—</span>;
  const meta = NICHE_META[niche];
  return (
    <span className="status-pill" style={{ color: meta.color, borderColor: "transparent", background: meta.bg }}>
      {meta.label}
    </span>
  );
}
