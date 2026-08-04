"use client";

import { Search } from "lucide-react";
import { LeadSource, QualificationStatus } from "@/types/inbound";
import { AdCampaign } from "@/types/ads";
import { SOURCES } from "@/lib/constants/inbound";
import { QUALIFICATION_STATUSES } from "@/lib/constants/ads";

export interface InboundFilterState {
  search: string;
  source: LeadSource | "all";
  campaignId: string | "all" | "none";
  qualification: QualificationStatus | "all";
  followupDue: boolean;
}

interface InboundFiltersProps {
  value: InboundFilterState;
  campaigns: AdCampaign[];
  onChange: (next: InboundFilterState) => void;
}

export default function InboundFilters({
  value,
  campaigns,
  onChange,
}: InboundFiltersProps) {
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

      {/* Only worth showing once there are campaigns to filter by. */}
      {campaigns.length > 0 && (
        <select
          className="filter-select"
          value={value.campaignId}
          onChange={(e) => onChange({ ...value, campaignId: e.target.value })}
          aria-label="Filter by campaign"
        >
          <option value="all">All campaigns</option>
          <option value="none">No campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <select
        className="filter-select"
        value={value.qualification}
        onChange={(e) =>
          onChange({ ...value, qualification: e.target.value as QualificationStatus | "all" })
        }
        aria-label="Filter by qualification"
      >
        <option value="all">Any qualification</option>
        {QUALIFICATION_STATUSES.map((s) => (
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
