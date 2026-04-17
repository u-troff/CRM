"use client";

import { useLeads } from "@/hooks/useLeads";
import { buildDialQueue } from "@/lib/leads/queue";

export default function StatusIndicator() {
  const { leads } = useLeads();

  const totalLeads = leads.length;
  const dialQueue = buildDialQueue(leads);
  const queueCount = dialQueue.length;
  const tier1Count = leads.filter((l) => l.tier === "TIER 1").length;

  return (
    <div className="status-indicator">
      <span className="led-dot" aria-hidden="true" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ color: "var(--text-muted)", fontSize: 10, letterSpacing: "0.04em" }}>
          LIVE
        </span>
        <span style={{ color: "var(--text-secondary)", fontSize: 10 }}>
          {totalLeads} leads · {queueCount} in queue
        </span>
        <span style={{ color: "var(--accent-lime)", fontSize: 10 }}>
          {tier1Count} TIER 1
        </span>
      </div>
    </div>
  );
}
