"use client";

import { Search } from "lucide-react";
import { ProjectStatus } from "@/types/client";
import { PROJECT_STATUSES } from "@/lib/constants/clients";

export interface ClientFilterState {
  search: string;
  status: ProjectStatus | "all";
}

interface ClientFiltersProps {
  value: ClientFilterState;
  onChange: (next: ClientFilterState) => void;
}

export default function ClientFilters({ value, onChange }: ClientFiltersProps) {
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
          placeholder="Search client, project…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>

      <select
        className="filter-select"
        value={value.status}
        onChange={(e) =>
          onChange({ ...value, status: e.target.value as ProjectStatus | "all" })
        }
        aria-label="Filter by status"
      >
        <option value="all">All statuses</option>
        {PROJECT_STATUSES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
