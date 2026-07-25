"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Plus, CalendarClock } from "lucide-react";
import { InboundLead, InboundLeadInput, InboundStage } from "@/types/inbound";
import { useInboundLeads } from "@/hooks/useInboundLeads";
import { useNurture } from "@/hooks/useNurture";
import { isFollowupDue } from "@/lib/inbound/date";
import { createInboundLead, updateLeadStage, deleteInboundLead } from "@/lib/inbound/mutations";
import TopBar from "@/components/layout/TopBar";
import InboundBoard from "@/components/inbound/InboundBoard";
import InboundFilters, { InboundFilterState } from "@/components/inbound/InboundFilters";
import AddLeadModal from "@/components/inbound/AddLeadModal";
import LeadDetailPanel, { DetailTab } from "@/components/inbound/LeadDetailPanel";

function matchesFilter(lead: InboundLead, f: InboundFilterState): boolean {
  if (f.source !== "all" && lead.source !== f.source) return false;
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

  const [filters, setFilters] = useState<InboundFilterState>({
    search: "",
    source: "all",
    followupDue: false,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("details");

  const filtered = useMemo(
    () => leads.filter((l) => matchesFilter(l, filters)),
    [leads, filters]
  );
  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  const handleCreate = useCallback(
    async (input: InboundLeadInput) => {
      const created = await createInboundLead(input);
      patchLead(created);
      reload();
    },
    [patchLead, reload]
  );

  const handleStageChange = useCallback(
    async (lead: InboundLead, newStage: InboundStage) => {
      const prevStage = lead.stage;
      const snapshot = patchLead({ ...lead, stage: newStage });
      try {
        await updateLeadStage(lead.id, newStage, prevStage);
      } catch {
        restore(snapshot);
      }
    },
    [patchLead, restore]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const snapshot = removeLead(id);
      if (selectedId === id) setSelectedId(null);
      try {
        await deleteInboundLead(id);
      } catch {
        restore(snapshot);
      }
    },
    [removeLead, restore, selectedId]
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
        <InboundFilters value={filters} onChange={setFilters} />

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

      {addOpen && <AddLeadModal onClose={() => setAddOpen(false)} onCreate={handleCreate} />}

      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          sequences={sequences}
          steps={steps}
          initialTab={tab}
          onClose={() => setSelectedId(null)}
          onLeadUpdated={(updated) => patchLead(updated)}
        />
      )}
    </>
  );
}
