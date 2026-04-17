"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLeads } from "@/hooks/useLeads";
import LeadDetailClient from "./LeadDetailClient";

export default function LeadDetailGate({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { leads, loading, error } = useLeads();

  const lead = useMemo(() => leads.find((item) => item.id === leadId) ?? null, [leads, leadId]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-skeleton-table">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="loading-skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="page-content" style={{ color: "var(--text-muted)" }}>
        Lead not found. <button className="btn-secondary" onClick={() => router.replace("/pipeline")}>Back to pipeline</button>
      </div>
    );
  }

  return <LeadDetailClient lead={lead} />;
}
