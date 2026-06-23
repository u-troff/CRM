"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { createLead } from "@/lib/leads/mutations";
import TopBar from "@/components/layout/TopBar";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import DailyTargetTracker from "@/components/outreach/DailyTargetTracker";

export default function KanbanPage() {
  const { leads, loading, error, reload, saveLead, deleteLead } = useLeads();

  const handleAddManual = useCallback(async () => {
    const lead = createLead({
      businessName: "New Lead",
      city: "",
      phone: "",
      phoneRaw: "",
      website: "",
      rating: null,
      reviewCount: null,
      isFranchise: false,
      tier: "TIER 2",
      websiteNotes: "",
      ownerName: "",
      source: "manual",
    });
    await saveLead(lead);
  }, [saveLead]);

  return (
    <>
      <TopBar title="Kanban">
        <button className="btn-primary" onClick={handleAddManual} aria-label="Add lead manually">
          <Plus size={13} />
          Add Lead
        </button>
      </TopBar>
      <div style={{ padding: "0 24px 16px" }}>
        <DailyTargetTracker initialData={null} collapsible defaultCollapsed />
      </div>
      <div className="page-content" style={{ overflow: "hidden" }}>
        <KanbanBoard leads={leads} loading={loading} error={error} reload={reload} onDeleteLead={deleteLead} />
      </div>
    </>
  );
}
