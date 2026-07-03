"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AllLeadsRow, EnrichmentNiche, EnrichmentStatus, LeadFormValues } from "@/types/enrichment";
import NichePill from "./NichePill";
import EnrichStatusPill from "./EnrichStatusPill";
import LeadFormModal from "./LeadFormModal";
import DedupeConfirmModal from "./DedupeConfirmModal";
import Toast from "./Toast";

const PER_PAGE = 50;
const DEBOUNCE_MS = 500;

interface AllLeadsResponse {
  leads: AllLeadsRow[];
  total: number;
  page: number;
  per_page: number;
}

function getCsvFilename(row: AllLeadsRow): string {
  const jobs = row.enrichment_jobs;
  const job = Array.isArray(jobs) ? jobs[0] : jobs;
  return job?.csv_filename ?? "—";
}

function toFormValues(lead: AllLeadsRow): Partial<LeadFormValues> {
  return {
    first_name: lead.first_name ?? "",
    last_name: lead.last_name ?? "",
    email: lead.email ?? "",
    company_name: lead.company_name ?? "",
    lead_city: lead.lead_city ?? "",
    lead_state: lead.lead_state ?? "",
    lead_country: lead.lead_country ?? "",
    company_website: lead.company_website ?? "",
    company_phone: lead.company_phone ?? "",
    niche: lead.niche ?? "flooring",
  };
}

export default function AllLeadsTable() {
  const [leads, setLeads] = useState<AllLeadsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState<"all" | EnrichmentNiche>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EnrichmentStatus>("all");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<AllLeadsRow | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showDedupeModal, setShowDedupeModal] = useState(false);
  const [dedupeLoading, setDedupeLoading] = useState(false);
  const [runningEnrichment, setRunningEnrichment] = useState(false);
  const [polling, setPolling] = useState(false);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());

  const tableRef = useRef<HTMLDivElement>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const filtersActive = !!search || nicheFilter !== "all" || statusFilter !== "all";

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (nicheFilter !== "all") params.set("niche", nicheFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/enrich/leads/all?${params.toString()}`);
      const data: AllLeadsResponse = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? "Failed to load leads");
      setLeads(data.leads);
      setTotal(data.total);
      setError(null);
      return data.leads;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
      return [];
    } finally {
      setLoading(false);
    }
  }, [page, search, nicheFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchLeads();
  }, [fetchLeads]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [search, nicheFilter, statusFilter]);

  // The row set changes whenever the page changes — drop any selection from
  // the previous page so it can't be applied to rows the user never saw.
  useEffect(() => {
    setSelected(new Set());
    setConfirmBulkDelete(false);
  }, [page]);

  // While a run is in flight, poll for status changes — skip the tick
  // entirely if the user is actively editing a Subject/Intro field, so we
  // don't blow away unsaved keystrokes or yank focus out from under them.
  // Stops automatically once nothing on the current page is still pending
  // or processing.
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      const active = document.activeElement;
      const isEditingCell =
        active instanceof HTMLElement &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA") &&
        tableRef.current?.contains(active);

      if (isEditingCell) return;

      const refreshed = await fetchLeads();
      const stillRunning = refreshed.some(
        (l) =>
          l.enrichment_status === "pending" ||
          l.enrichment_status === "processing" ||
          l.enrichment_status === "scraping"
      );
      if (!stillRunning) setPolling(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [polling, fetchLeads]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
  }, []);

  const flashField = useCallback((key: string) => {
    setFlashKeys((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setFlashKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 700);
  }, []);

  const handleFieldChange = useCallback(
    (id: string, field: "custom_subject" | "custom_intro", value: string) => {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

      const key = `${id}:${field}`;
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(async () => {
        try {
          await fetch(`/api/enrich/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value }),
          });
          flashField(key);
        } catch {
          // leave the field as-is — next save attempt or refresh will retry
        }
      }, DEBOUNCE_MS);
    },
    [flashField]
  );

  const handleDelete = useCallback(async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setConfirmDeleteId(null);
    try {
      await fetch(`/api/enrich/leads/${id}`, { method: "DELETE" });
    } catch {
      // already removed from view; revisit the page if this silently failed
    }
  }, []);

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelected(checked ? new Set(leads.map((l) => l.id)) : new Set());
    },
    [leads]
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selected);
    setLeads((prev) => prev.filter((l) => !selected.has(l.id)));
    setTotal((prev) => Math.max(0, prev - ids.length));
    setSelected(new Set());
    setConfirmBulkDelete(false);
    try {
      await Promise.all(ids.map((id) => fetch(`/api/enrich/leads/${id}`, { method: "DELETE" })));
    } catch {
      // already removed from view; revisit the page if any of these silently failed
    }
  }, [selected]);

  const handleCreate = useCallback(
    async (values: LeadFormValues) => {
      setSavingForm(true);
      setFormError(null);
      try {
        const res = await fetch("/api/enrich/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to add lead");
        setShowCreateModal(false);
        setToastMessage("Lead added");
        setSearch("");
        setSearchInput("");
        setPage(1);
        await fetchLeads();
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Failed to add lead");
      } finally {
        setSavingForm(false);
      }
    },
    [fetchLeads]
  );

  const handleEditSave = useCallback(
    async (values: LeadFormValues) => {
      if (!editingLead) return;
      setSavingForm(true);
      setFormError(null);
      try {
        const res = await fetch(`/api/enrich/leads/${editingLead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save lead");
        setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? { ...l, ...data } : l)));
        setEditingLead(null);
        setToastMessage("Lead updated");
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Failed to save lead");
      } finally {
        setSavingForm(false);
      }
    },
    [editingLead]
  );

  const handleDedupeConfirm = useCallback(async () => {
    setDedupeLoading(true);
    try {
      const res = await fetch("/api/enrich/deduplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setShowDedupeModal(false);
      setToastMessage(`Removed ${data.removed ?? 0} duplicates`);
      setPage(1);
      await fetchLeads();
    } catch {
      setShowDedupeModal(false);
      setToastMessage("Failed to remove duplicates");
    } finally {
      setDedupeLoading(false);
    }
  }, [fetchLeads]);

  const handleRunEnrichment = useCallback(async () => {
    setRunningEnrichment(true);
    try {
      const res = await fetch("/api/enrich/run-pending", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start enrichment");
      if (!data.pending_count) {
        setToastMessage("No pending leads to enrich");
      } else {
        setToastMessage(
          `Started enrichment for ${data.pending_count} pending lead${data.pending_count === 1 ? "" : "s"}`
        );
        setPolling(true);
        await fetchLeads();
      }
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : "Failed to start enrichment");
    } finally {
      setRunningEnrichment(false);
    }
  }, [fetchLeads]);

  const allSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // "Enriched" always means done leads — niche + search carry over from the
  // current filters, status does not (the point of this button is the
  // done-only Smartlead-ready subset, regardless of the status dropdown).
  const downloadFilteredParams = new URLSearchParams();
  if (nicheFilter !== "all") downloadFilteredParams.set("niche", nicheFilter);
  if (search) downloadFilteredParams.set("search", search);
  const downloadFilteredHref = `/api/enrich/download/filtered${
    downloadFilteredParams.toString() ? `?${downloadFilteredParams.toString()}` : ""
  }`;

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ marginBottom: 4, color: "var(--text-primary)", fontSize: 14, fontWeight: 600 }}>
        All Leads in Database
      </div>
      <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div className="toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search name, company, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            aria-label="Search leads"
          />
          <button className="btn-secondary" onClick={handleSearchSubmit}>
            <Search size={13} />
            Search
          </button>
          {search && (
            <button className="icon-btn" aria-label="Clear search" onClick={handleClearSearch}>
              <X size={14} />
            </button>
          )}

          <select
            className="filter-select"
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value as "all" | EnrichmentNiche)}
            aria-label="Filter by niche"
          >
            <option value="all">All Niches</option>
            <option value="flooring">Flooring</option>
            <option value="remodeling">Remodeling</option>
            <option value="plumbing">Plumbing</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | EnrichmentStatus)}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="done">Done</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="scraping">Scraping</option>
            <option value="failed">Failed</option>
            <option value="no_website">No Website</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{total} leads</span>
          {selected.size > 0 &&
            (confirmBulkDelete ? (
              <>
                <button className="btn-danger" style={{ fontSize: 11 }} onClick={handleBulkDelete}>
                  Confirm Delete {selected.size}
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 11 }}
                  onClick={() => setConfirmBulkDelete(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="btn-danger"
                style={{ fontSize: 11 }}
                onClick={() => setConfirmBulkDelete(true)}
              >
                <Trash2 size={12} />
                Delete {selected.size}
              </button>
            ))}
          <a href="/api/enrich/download/all" className="btn-secondary">
            <Download size={13} />
            Download All
          </a>
          <a href={downloadFilteredHref} className="btn-secondary">
            <Download size={13} />
            Download Enriched CSV
          </a>
          <button className="btn-secondary" onClick={() => setShowDedupeModal(true)}>
            <AlertTriangle size={13} />
            Remove Duplicates
          </button>
          <button className="btn-secondary" onClick={handleRunEnrichment} disabled={runningEnrichment || polling}>
            <Play size={13} />
            {runningEnrichment ? "Starting..." : polling ? "Enriching..." : "Run Enrichment"}
          </button>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={13} />
            Add Lead
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!error && loading && leads.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">Loading leads...</div>
        </div>
      )}

      {!error && !loading && leads.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">
            {filtersActive ? "No leads match these filters" : "No leads in the database"}
          </div>
        </div>
      )}

      {leads.length > 0 && (
        <div ref={tableRef}>
          <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32, padding: "0 8px 0 12px" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Select all leads"
                      style={{ cursor: "pointer", accentColor: "var(--accent-lime)" }}
                    />
                  </th>
                  <th>#</th>
                  <th>First Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Country</th>
                  <th>Niche</th>
                  <th style={{ minWidth: 180 }}>Subject</th>
                  <th style={{ minWidth: 240 }}>Intro</th>
                  <th>Status</th>
                  <th>Source CSV</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, idx) => {
                  const rowNumber = (page - 1) * PER_PAGE + idx + 1;
                  const editableCopy = lead.enrichment_status === "done";
                  const subjectFlash = flashKeys.has(`${lead.id}:custom_subject`);
                  const introFlash = flashKeys.has(`${lead.id}:custom_intro`);

                  return (
                    <tr key={lead.id} className={selected.has(lead.id) ? "selected" : undefined}>
                      <td style={{ padding: "0 8px 0 12px" }}>
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={(e) => handleSelect(lead.id, e.target.checked)}
                          aria-label={`Select ${lead.company_name || "lead"}`}
                          style={{ cursor: "pointer", accentColor: "var(--accent-lime)" }}
                        />
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{rowNumber}</td>
                      <td>{lead.first_name || "—"}</td>
                      <td>{lead.company_name || "—"}</td>
                      <td>{lead.email || "—"}</td>
                      <td>{lead.lead_city || "—"}</td>
                      <td>{lead.lead_state || "—"}</td>
                      <td>{lead.lead_country || "—"}</td>
                      <td>
                        <NichePill niche={lead.niche} />
                      </td>
                      <td style={{ whiteSpace: "normal", maxWidth: 220 }}>
                        {editableCopy ? (
                          <input
                            className="form-input"
                            style={{
                              fontSize: 11,
                              padding: "5px 8px",
                              background: subjectFlash ? "rgba(163,230,53,0.12)" : "var(--bg-base)",
                              transition: "background 0.2s",
                            }}
                            value={lead.custom_subject ?? ""}
                            onChange={(e) => handleFieldChange(lead.id, "custom_subject", e.target.value)}
                          />
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>{lead.custom_subject || "—"}</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: "normal", maxWidth: 320 }}>
                        {editableCopy ? (
                          <textarea
                            className="form-input"
                            rows={2}
                            style={{
                              fontSize: 11,
                              padding: "5px 8px",
                              minHeight: 0,
                              background: introFlash ? "rgba(163,230,53,0.12)" : "var(--bg-base)",
                              transition: "background 0.2s",
                            }}
                            value={lead.custom_intro ?? ""}
                            onChange={(e) => handleFieldChange(lead.id, "custom_intro", e.target.value)}
                          />
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>{lead.custom_intro || "—"}</span>
                        )}
                      </td>
                      <td>
                        <EnrichStatusPill status={lead.enrichment_status} error={lead.enrichment_error} />
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{getCsvFilename(lead)}</td>
                      <td>
                        {confirmDeleteId === lead.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Delete?</span>
                            <button
                              className="icon-btn"
                              aria-label="Confirm delete"
                              onClick={() => handleDelete(lead.id)}
                            >
                              <Check size={14} color="var(--accent-red)" />
                            </button>
                            <button
                              className="icon-btn"
                              aria-label="Cancel delete"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <button
                              className="icon-btn"
                              aria-label="Edit lead"
                              onClick={() => setEditingLead(lead)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-btn"
                              aria-label="Delete lead"
                              onClick={() => setConfirmDeleteId(lead.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={13} />
                Prev
              </button>
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <LeadFormModal
          mode="create"
          saving={savingForm}
          error={formError}
          onCancel={() => {
            setShowCreateModal(false);
            setFormError(null);
          }}
          onSave={handleCreate}
        />
      )}

      {editingLead && (
        <LeadFormModal
          mode="edit"
          initial={toFormValues(editingLead)}
          saving={savingForm}
          error={formError}
          onCancel={() => {
            setEditingLead(null);
            setFormError(null);
          }}
          onSave={handleEditSave}
        />
      )}

      {showDedupeModal && (
        <DedupeConfirmModal
          loading={dedupeLoading}
          onCancel={() => setShowDedupeModal(false)}
          onConfirm={handleDedupeConfirm}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
    </div>
  );
}
