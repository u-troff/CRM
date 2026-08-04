"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Plus, BarChart2 } from "lucide-react";
import { AdCampaign, AdCampaignInput, AdSpendEntryInput } from "@/types/ads";
import { useAdCampaigns } from "@/hooks/useAdCampaigns";
import { useAdSpend } from "@/hooks/useAdSpend";
import { useInboundLeads } from "@/hooks/useInboundLeads";
import { useInvalidateCampaignReport } from "@/hooks/useCampaignReport";
import {
  createAdCampaign,
  updateAdCampaign,
  deleteAdCampaign,
  createSpendEntry,
  updateSpendEntry,
  deleteSpendEntry,
} from "@/lib/ads/mutations";
import { entriesForCampaign } from "@/lib/ads/queries";
import TopBar from "@/components/layout/TopBar";
import CampaignTable from "@/components/ads/CampaignTable";
import CampaignFormModal from "@/components/ads/CampaignFormModal";
import SpendEntriesModal from "@/components/ads/SpendEntriesModal";

export default function CampaignsPage() {
  const {
    campaigns,
    loading,
    error,
    reload,
    patchCampaign,
    removeCampaign,
    restore,
  } = useAdCampaigns();
  const {
    entries,
    error: spendError,
    reload: reloadSpend,
    patchEntry,
    removeEntry,
    restore: restoreSpend,
  } = useAdSpend();
  const { leads } = useInboundLeads();
  const invalidateReport = useInvalidateCampaignReport();

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spendCampaignId, setSpendCampaignId] = useState<string | null>(null);

  const editingCampaign = campaigns.find((c) => c.id === editingId) ?? null;
  const spendCampaign = campaigns.find((c) => c.id === spendCampaignId) ?? null;

  // How many inbound leads point at each campaign. Counted off the board rather
  // than the report view so this page works before any spend is logged.
  const leadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lead of leads) {
      if (lead.campaignId) counts[lead.campaignId] = (counts[lead.campaignId] ?? 0) + 1;
    }
    return counts;
  }, [leads]);

  const handleCreate = useCallback(
    async (input: AdCampaignInput) => {
      const created = await createAdCampaign(input);
      patchCampaign(created);
      reload();
      invalidateReport();
    },
    [patchCampaign, reload, invalidateReport]
  );

  const handleUpdate = useCallback(
    async (id: string, input: AdCampaignInput) => {
      const updated = await updateAdCampaign(id, input);
      patchCampaign(updated);
      invalidateReport();
    },
    [patchCampaign, invalidateReport]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const snapshot = removeCampaign(id);
      if (editingId === id) setEditingId(null);
      if (spendCampaignId === id) setSpendCampaignId(null);
      try {
        await deleteAdCampaign(id);
        // Its spend entries went with it, and any lead that pointed at it is
        // now unattributed.
        reloadSpend();
        invalidateReport();
      } catch {
        restore(snapshot);
      }
    },
    [removeCampaign, restore, editingId, spendCampaignId, reloadSpend, invalidateReport]
  );

  const handleSpendCreate = useCallback(
    async (campaignId: string, input: AdSpendEntryInput) => {
      const created = await createSpendEntry(campaignId, input);
      patchEntry(created);
      reloadSpend();
      invalidateReport();
    },
    [patchEntry, reloadSpend, invalidateReport]
  );

  const handleSpendUpdate = useCallback(
    async (id: string, input: AdSpendEntryInput) => {
      const updated = await updateSpendEntry(id, input);
      patchEntry(updated);
      invalidateReport();
    },
    [patchEntry, invalidateReport]
  );

  const handleSpendDelete = useCallback(
    async (id: string) => {
      const snapshot = removeEntry(id);
      try {
        await deleteSpendEntry(id);
        invalidateReport();
      } catch (e) {
        restoreSpend(snapshot);
        throw e;
      }
    },
    [removeEntry, restoreSpend, invalidateReport]
  );

  return (
    <>
      <TopBar title="Ad Campaigns">
        <Link href="/campaigns/report" className="btn-secondary" style={{ textDecoration: "none" }}>
          <BarChart2 size={13} />
          Report
        </Link>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={13} />
          Add Campaign
        </button>
      </TopBar>

      <div className="page-content">
        {(error || spendError) && (
          <div className="error-banner" style={{ marginBottom: 12 }}>
            {error ?? spendError}
          </div>
        )}

        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>
          The campaigns you're paying for, and what each one has cost. Log spend
          per week, then attribute inbound leads to a campaign on the board to
          see cost per lead, per qualified lead and per win in the report.
        </p>

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <CampaignTable
            campaigns={campaigns}
            entries={entries}
            leadCounts={leadCounts}
            onEdit={(campaign) => setEditingId(campaign.id)}
            onManageSpend={(campaign: AdCampaign) => setSpendCampaignId(campaign.id)}
            onDelete={handleDelete}
          />
        )}
      </div>

      {addOpen && (
        <CampaignFormModal onClose={() => setAddOpen(false)} onSave={handleCreate} />
      )}

      {editingCampaign && (
        <CampaignFormModal
          campaign={editingCampaign}
          onClose={() => setEditingId(null)}
          onSave={(input) => handleUpdate(editingCampaign.id, input)}
        />
      )}

      {spendCampaign && (
        <SpendEntriesModal
          campaign={spendCampaign}
          entries={entriesForCampaign(entries, spendCampaign.id)}
          onClose={() => setSpendCampaignId(null)}
          onCreate={(input) => handleSpendCreate(spendCampaign.id, input)}
          onUpdate={handleSpendUpdate}
          onDelete={handleSpendDelete}
        />
      )}
    </>
  );
}
