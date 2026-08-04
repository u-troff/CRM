"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Plus, CalendarClock } from "lucide-react";
import { InboundLead, InboundLeadInput, InboundStage } from "@/types/inbound";
import { useInboundLeads } from "@/hooks/useInboundLeads";
import { useNurture } from "@/hooks/useNurture";
import { useAdCampaigns } from "@/hooks/useAdCampaigns";
import { useInvalidateCampaignReport } from "@/hooks/useCampaignReport";
import { useClientRevenue } from "@/hooks/useClientRevenue";
import { entriesForLead } from "@/lib/revenue/queries";
import { isFollowupDue } from "@/lib/inbound/date";
import { createInboundLead, updateLeadStage, deleteInboundLead } from "@/lib/inbound/mutations";
import TopBar from "@/components/layout/TopBar";
import InboundBoard from "@/components/inbound/InboundBoard";
import InboundFilters, { InboundFilterState } from "@/components/inbound/InboundFilters";
import AddLeadModal from "@/components/inbound/AddLeadModal";
import LeadDetailPanel, { DetailTab } from "@/components/inbound/LeadDetailPanel";
import WonRevenuePrompt from "@/components/revenue/WonRevenuePrompt";

function matchesFilter(lead: InboundLead, f: InboundFilterState): boolean {
  if (f.source !== "all" && lead.source !== f.source) return false;
  if (f.campaignId === "none" && lead.campaignId !== null) return false;
  if (f.campaignId !== "all" && f.campaignId !== "none" && lead.campaignId !== f.campaignId)
    return false;
  if (f.qualification !== "all" && lead.qualificationStatus !== f.qualification) return false;
  if (f.followupDue && !isFollowupDue(lead.nextFollowupAt)) return false;
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    const haystack = [lead.fullName, lead.businessName, lead.email, lead.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export default function InboundPage() {
  const { leads, loading, error, reload, patchLead, removeLead, restore } = useInboundLeads();
  const { sequences, steps } = useNurture();
  const { campaigns } = useAdCampaigns();
  const { entries: revenueEntries } = useClientRevenue();
  // Attribution and outcome both feed the campaign report, so every write here
  // drops it.
  const invalidateReport = useInvalidateCampaignReport();

  const [filters, setFilters] = useState<InboundFilterState>({
    search: "",
    source: "all",
    campaignId: "all",
    qualification: "all",
    followupDue: false,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("details");
  // Set when a card lands in Won, which opens the revenue prompt.
  const [wonLeadId, setWonLeadId] = useState<string | null>(null);

  const filtered = useMemo(
    () => leads.filter((l) => matchesFilter(l, filters)),
    [leads, filters]
  );
  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;
  const wonLead = leads.find((l) => l.id === wonLeadId) ?? null;
  const wonCampaign = campaigns.find((c) => c.id === wonLead?.campaignId) ?? null;

  const handleCreate = useCallback(
    async (input: InboundLeadInput) => {
      const created = await createInboundLead(input);
      patchLead(created);
      reload();
      invalidateReport();
    },
    [patchLead, reload, invalidateReport]
  );

  const handleStageChange = useCallback(
    async (lead: InboundLead, newStage: InboundStage) => {
      const snapshot = patchLead({ ...lead, stage: newStage });
      try {
        // The saved lead carries the outcome and milestones the new column
        // implies, so it replaces the optimistic copy rather than just the stage.
        const saved = await updateLeadStage(lead, newStage);
        patchLead(saved);
        invalidateReport();
        // Catch the first payment at the moment of the win rather than trusting
        // anyone to remember it later.
        if (newStage === "won" && lead.stage !== "won") setWonLeadId(lead.id);
      } catch {
        restore(snapshot);
      }
    },
    [patchLead, restore, invalidateReport]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const snapshot = removeLead(id);
      if (selectedId === id) setSelectedId(null);
      try {
        await deleteInboundLead(id);
        invalidateReport();
      } catch {
        restore(snapshot);
      }
    },
    [removeLead, restore, selectedId, invalidateReport]
  );

  const openLead = useCallback((lead: InboundLead) => {
    setSelectedId(lead.id);
    setTab("details");
  }, []);

  return (
    <>
      <TopBar title="Inbound Leads">
        <Link
          href="/inbound/followups"
          className="btn-secondary"
          style={{ textDecoration: "none" }}
        >
          <CalendarClock size={13} />
          Follow-ups
        </Link>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={13} />
          Add Lead
        </button>
      </TopBar>

      <div className="page-content" style={{ overflow: "hidden" }}>
        <InboundFilters value={filters} campaigns={campaigns} onChange={setFilters} />

        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <InboundBoard
            leads={filtered}
            onSelect={openLead}
            onDelete={handleDelete}
            onStageChange={handleStageChange}
          />
        )}
      </div>

      {addOpen && (
        <AddLeadModal
          campaigns={campaigns}
          onClose={() => setAddOpen(false)}
          onCreate={handleCreate}
        />
      )}

      {wonLead && (
        <WonRevenuePrompt
          lead={wonLead}
          entries={entriesForLead(revenueEntries, wonLead.id)}
          defaultCurrency={wonCampaign?.currency ?? "ZAR"}
          onClose={() => setWonLeadId(null)}
        />
      )}

      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          sequences={sequences}
          steps={steps}
          campaigns={campaigns}
          initialTab={tab}
          onClose={() => setSelectedId(null)}
          onLeadUpdated={(updated) => {
            patchLead(updated);
            invalidateReport();
          }}
        />
      )}
    </>
  );
}
