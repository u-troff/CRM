"use client";

import { Search } from "lucide-react";
import { LeadSource } from "@/types/inbound";
import { SOURCES } from "@/lib/constants/inbound";

export interface InboundFilterState {
  search: string;
  source: LeadSource | "all";
  followupDue: boolean;
}

interface InboundFiltersProps {
  value: InboundFilterState;
  onChange: (next: InboundFilterState) => void;
}

export default function InboundFilters({ value, onChange }: InboundFiltersProps) {
  return (
    <div className="toolbar" style={{ marginBottom: 12 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Search
          size={13}
          style={{ position: "absolute", left: 10, color: "var(--text-faint)", pointerEvents: "none" }}
        />
        <input
          className="search-input"
          style={{ paddingLeft: 30 }}
          placeholder="Search name, business, email, phone…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>

      <select
        className="filter-select"
        value={value.source}
        onChange={(e) => onChange({ ...value, source: e.target.value as LeadSource | "all" })}
        aria-label="Filter by source"
      >
        <option value="all">All sources</option>
        {SOURCES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: value.followupDue ? "var(--accent-cyan)" : "var(--text-secondary)",
          cursor: "pointer",
          border: "1px solid var(--border-default)",
          padding: "6px 10px",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={value.followupDue}
          onChange={(e) => onChange({ ...value, followupDue: e.target.checked })}
          style={{ accentColor: "var(--accent-cyan)" }}
        />
        Follow-up due
      </label>
    </div>
  );
}
