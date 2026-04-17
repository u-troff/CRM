"use client";

import { useState, useCallback } from "react";
import { useLeads } from "@/hooks/useLeads";
import { Upload, Plus, Download, Database } from "lucide-react";
import LeadTable from "@/components/leads/LeadTable";
import ImportModal from "@/components/import/ImportModal";
import TopBar from "@/components/layout/TopBar";
import { Lead } from "@/types/lead";
import { createLead } from "@/lib/leads/mutations";
import { getCallCount, getLastContact } from "@/lib/leads/queries";

function exportToCsv(leads: Lead[], filename: string) {
  const headers = [
    "ID",
    "Business Name",
    "City",
    "Owner",
    "Phone",
    "Phone Raw",
    "Website",
    "Rating",
    "Review Count",
    "Is Franchise",
    "Tier",
    "Status",
    "Call Count",
    "Last Contact Date",
    "Website Notes",
    "Source",
  ];

  function esc(v: string): string {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  }

  const rows = leads.map((l) => {
    const lastContact = getLastContact(l);
    return [
      l.id,
      l.businessName,
      l.city,
      l.ownerName,
      l.phone,
      l.phoneRaw,
      l.website,
      l.rating?.toString() ?? "",
      l.reviewCount?.toString() ?? "",
      l.isFranchise ? "YES" : "NO",
      l.tier,
      l.currentStatus,
      getCallCount(l).toString(),
      lastContact ? new Date(lastContact).toISOString().split("T")[0] : "",
      l.websiteNotes,
      l.source ?? "",
    ]
      .map((v) => esc(String(v ?? "")))
      .join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PipelinePage() {
  const { leads, loading, error, reload, saveLead, deleteLead, saveLeads } = useLeads();
  const [showImport, setShowImport] = useState(false);

  const handleImportComplete = useCallback(
    async (_added: number, _updated: number) => {
      await reload();
    },
    [reload]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      const remaining = leads.filter((l) => !ids.includes(l.id));
      await saveLeads(remaining);
    },
    [leads, saveLeads]
  );

  const handleExportSelected = useCallback(
    (ids: string[]) => {
      const selected = leads.filter((l) => ids.includes(l.id));
      const date = new Date().toISOString().split("T")[0];
      exportToCsv(selected, `uflow-leads-${date}.csv`);
    },
    [leads]
  );

  const handleExportAll = useCallback(() => {
    const date = new Date().toISOString().split("T")[0];
    exportToCsv(leads, `uflow-leads-${date}.csv`);
  }, [leads]);

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

  const handleLoadSample = useCallback(async () => {
    const res = await fetch("/sample-leads.csv");
    const text = await res.text();
    const { parseCsv } = await import("@/components/import/CsvParser");
    const { rowsToLeads } = await import("@/components/import/rowToLead");
    const { upsertLeads } = await import("@/lib/leads/mutations");
    const rows = parseCsv(text);
    const sampleLeads = rowsToLeads(rows, "csv_import");
    await upsertLeads(sampleLeads);
    await reload();
  }, [reload]);

  return (
    <>
      <TopBar title="Pipeline">
        <button
          className="btn-secondary"
          onClick={handleExportAll}
          aria-label="Export all leads"
          style={{ fontSize: 11 }}
        >
          <Download size={13} />
          Export CSV
        </button>
        <button
          className="btn-secondary"
          onClick={handleAddManual}
          aria-label="Add lead manually"
          style={{ fontSize: 11 }}
        >
          <Plus size={13} />
          Add Lead
        </button>
        <button
          className="btn-primary"
          onClick={() => setShowImport(true)}
          aria-label="Import leads"
        >
          <Upload size={13} />
          Import
        </button>
      </TopBar>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="loading-skeleton-table">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="loading-skeleton-row" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="empty-state">
            <Database size={40} color="var(--text-faint)" />
            <div className="empty-state-title">No leads yet</div>
            <div className="empty-state-subtitle">
              Import your Excel or CSV file to get started, or load the sample data to explore the
              CRM.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button className="btn-primary" onClick={() => setShowImport(true)}>
                <Upload size={14} />
                Import Leads
              </button>
              <button className="btn-secondary" onClick={handleLoadSample}>
                Load Sample Data
              </button>
            </div>
          </div>
        ) : (
          <LeadTable
            leads={leads}
            onSaveLead={saveLead}
            onDeleteLead={deleteLead}
            onBulkDelete={handleBulkDelete}
            onExportSelected={handleExportSelected}
          />
        )}
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImportComplete={async (added, updated) => {
            await handleImportComplete(added, updated);
            setShowImport(false);
          }}
        />
      )}
    </>
  );
}
