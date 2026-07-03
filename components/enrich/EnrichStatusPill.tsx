import { EnrichmentStatus } from "@/types/enrichment";

const STATUS_META: Record<EnrichmentStatus, { label: string; color: string; bg: string }> = {
  done: { label: "Done", color: "var(--accent-lime)", bg: "rgba(163,230,53,0.15)" },
  pending: { label: "Pending", color: "var(--text-muted)", bg: "rgba(115,115,115,0.15)" },
  processing: { label: "Processing", color: "var(--accent-cyan)", bg: "rgba(34,211,238,0.15)" },
  scraping: { label: "Scraping", color: "var(--accent-cyan)", bg: "rgba(34,211,238,0.15)" },
  failed: { label: "Failed", color: "var(--accent-red)", bg: "rgba(220,38,38,0.15)" },
  no_website: { label: "No Website", color: "var(--text-muted)", bg: "rgba(115,115,115,0.15)" },
};

export default function EnrichStatusPill({
  status,
  error,
}: {
  status: EnrichmentStatus;
  error?: string | null;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className="status-pill"
      style={{
        color: meta.color,
        borderColor: "transparent",
        background: meta.bg,
        animation:
          status === "processing" || status === "scraping" ? "pulse-led 1.5s ease-in-out infinite" : undefined,
      }}
      title={status === "failed" ? error ?? undefined : undefined}
    >
      {meta.label}
    </span>
  );
}
