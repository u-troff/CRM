"use client";

import { useState, useCallback, useMemo } from "react";
import { Lead, LeadTier, CallStatus } from "@/types/lead";
import { filterLeads, sortLeads, SortField, SortDir } from "@/lib/leads/queries";
import { ALL_STATUSES, STATUS_META } from "@/lib/constants/statuses";
import { ALL_TIERS } from "@/lib/constants/tiers";
import LeadRow from "./LeadRow";
import LeadEditor from "./LeadEditor";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";

interface LeadTableProps {
  leads: Lead[];
  onSaveLead: (lead: Lead) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onExportSelected: (ids: string[]) => void;
}

const COLUMNS: { key: SortField; label: string; title?: string }[] = [
  { key: "tier", label: "Tier" },
  { key: "businessName", label: "Business" },
  { key: "businessName", label: "Owner" }, // not sortable the same key, handled separately
  { key: "businessName", label: "Phone" },
  { key: "rating", label: "Rating" },
  { key: "currentStatus", label: "Status" },
  { key: "callCount", label: "Calls" },
  { key: "lastContact", label: "Last" },
];

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <Minus size={10} color="var(--text-faint)" />;
  return sortDir === "asc"
    ? <ChevronUp size={10} color="var(--accent-lime)" />
    : <ChevronDown size={10} color="var(--accent-lime)" />;
}

export default function LeadTable({
  leads,
  onSaveLead,
  onDeleteLead,
  onBulkDelete,
  onExportSelected,
}: LeadTableProps) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<LeadTier | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CallStatus | "all">("all");
  const [franchiseFilter, setFranchiseFilter] = useState<boolean | "all">("all");
  const [sortField, setSortField] = useState<SortField>("tier");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const filtered = useMemo(
    () =>
      filterLeads(leads, {
        search,
        tier: tierFilter,
        status: statusFilter,
        isFranchise: franchiseFilter,
      }),
    [leads, search, tierFilter, statusFilter, franchiseFilter]
  );

  const sorted = useMemo(
    () => sortLeads(filtered, sortField, sortDir),
    [filtered, sortField, sortDir]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelected(new Set(sorted.map((l) => l.id)));
      } else {
        setSelected(new Set());
      }
    },
    [sorted]
  );

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const allSelected = sorted.length > 0 && sorted.every((l) => selected.has(l.id));

  const handleBulkDelete = useCallback(async () => {
    await onBulkDelete(Array.from(selected));
    setSelected(new Set());
    setConfirmBulkDelete(false);
  }, [selected, onBulkDelete]);

  const handleSaveLead = useCallback(
    async (updated: Lead) => {
      await onSaveLead(updated);
      setEditingLead(null);
    },
    [onSaveLead]
  );

  const handleDeleteLead = useCallback(
    async (id: string) => {
      await onDeleteLead(id);
      setEditingLead(null);
    },
    [onDeleteLead]
  );

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <input
          type="text"
          className="search-input"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search leads"
        />

        <select
          className="filter-select"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as LeadTier | "all")}
          aria-label="Filter by tier"
        >
          <option value="all">All Tiers</option>
          {ALL_TIERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CallStatus | "all")}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={String(franchiseFilter)}
          onChange={(e) => {
            const v = e.target.value;
            setFranchiseFilter(v === "all" ? "all" : v === "true");
          }}
          aria-label="Filter by franchise"
        >
          <option value="all">All</option>
          <option value="false">Non-Franchise</option>
          <option value="true">Franchise</option>
        </select>

        <span style={{ color: "var(--text-faint)", fontSize: 11, marginLeft: 4 }}>
          {sorted.length} / {leads.length}
        </span>

        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              className="btn-secondary"
              onClick={() => onExportSelected(Array.from(selected))}
              style={{ fontSize: 11 }}
            >
              Export {selected.size}
            </button>
            {confirmBulkDelete ? (
              <>
                <button className="btn-danger" onClick={handleBulkDelete} style={{ fontSize: 11 }}>
                  Confirm Delete {selected.size}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmBulkDelete(false)}
                  style={{ fontSize: 11 }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="btn-danger"
                onClick={() => setConfirmBulkDelete(true)}
                style={{ fontSize: 11 }}
              >
                Delete {selected.size}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)" }}>
        <table className="data-table" style={{ tableLayout: "fixed", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 36, padding: "0 8px 0 12px" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all leads"
                  style={{ cursor: "pointer", accentColor: "var(--accent-lime)" }}
                />
              </th>
              <th
                className="sortable"
                style={{ width: 48, textAlign: "center" }}
                onClick={() => handleSort("tier")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "center" }}>
                  Tier <SortIcon field="tier" sortField={sortField} sortDir={sortDir} />
                </div>
              </th>
              <th
                className="sortable"
                style={{ width: 200 }}
                onClick={() => handleSort("businessName")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  Business <SortIcon field="businessName" sortField={sortField} sortDir={sortDir} />
                </div>
              </th>
              <th style={{ width: 100 }}>Owner</th>
              <th style={{ width: 140 }}>Phone</th>
              <th
                className="sortable"
                style={{ width: 100 }}
                onClick={() => handleSort("rating")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  Rating <SortIcon field="rating" sortField={sortField} sortDir={sortDir} />
                </div>
              </th>
              <th
                className="sortable"
                style={{ width: 140 }}
                onClick={() => handleSort("currentStatus")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  Status <SortIcon field="currentStatus" sortField={sortField} sortDir={sortDir} />
                </div>
              </th>
              <th
                className="sortable"
                style={{ width: 60, textAlign: "center" }}
                onClick={() => handleSort("callCount")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "center" }}>
                  Calls <SortIcon field="callCount" sortField={sortField} sortDir={sortDir} />
                </div>
              </th>
              <th
                className="sortable"
                style={{ width: 90 }}
                onClick={() => handleSort("lastContact")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  Last <SortIcon field="lastContact" sortField={sortField} sortDir={sortDir} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                selected={selected.has(lead.id)}
                onSelect={handleSelect}
                onClick={() => setEditingLead(lead)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {editingLead && (
        <LeadEditor
          lead={editingLead}
          onSave={handleSaveLead}
          onDelete={() => handleDeleteLead(editingLead.id)}
          onClose={() => setEditingLead(null)}
        />
      )}
    </>
  );
}
