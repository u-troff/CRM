"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, Minus, Pencil, Trash2 } from "lucide-react";
import { ClientProject, ProjectStatus } from "@/types/client";
import { PROJECT_STATUSES, PROJECT_STATUS_MAP, PROJECT_STATUS_ORDER } from "@/lib/constants/clients";
import { formatCurrency } from "@/lib/clients/format";

export type ClientSortField =
  | "clientName"
  | "status"
  | "totalProjectValue"
  | "amountReceived"
  | "amountOutstanding"
  | "deliveryCost"
  | "netProfit";

type SortDir = "asc" | "desc";

interface ClientProjectsTableProps {
  projects: ClientProject[];
  onEdit: (project: ClientProject) => void;
  onStatusChange: (project: ClientProject, status: ProjectStatus) => void;
  onDelete: (id: string) => void;
}

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: ClientSortField;
  sortField: ClientSortField;
  sortDir: SortDir;
}) {
  if (field !== sortField) return <Minus size={10} color="var(--text-faint)" />;
  return sortDir === "asc" ? (
    <ChevronUp size={10} color="var(--accent-lime)" />
  ) : (
    <ChevronDown size={10} color="var(--accent-lime)" />
  );
}

function sortValue(project: ClientProject, field: ClientSortField): string | number {
  if (field === "clientName") return project.clientName.toLowerCase();
  if (field === "status") return PROJECT_STATUS_ORDER[project.status];
  return project[field];
}

export default function ClientProjectsTable({
  projects,
  onEdit,
  onStatusChange,
  onDelete,
}: ClientProjectsTableProps) {
  const [sortField, setSortField] = useState<ClientSortField>("clientName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSort = useCallback(
    (field: ClientSortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...projects].sort((a, b) => {
      const av = sortValue(a, sortField);
      const bv = sortValue(b, sortField);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [projects, sortField, sortDir]);

  const totals = useMemo(
    () =>
      projects.reduce(
        (acc, p) => ({
          total: acc.total + p.totalProjectValue,
          received: acc.received + p.amountReceived,
          outstanding: acc.outstanding + p.amountOutstanding,
          cost: acc.cost + p.deliveryCost,
          profit: acc.profit + p.netProfit,
        }),
        { total: 0, received: 0, outstanding: 0, cost: 0, profit: 0 }
      ),
    [projects]
  );

  const money = (value: number, color?: string) => (
    <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color }}>
      {formatCurrency(value)}
    </td>
  );

  const sortableHeader = (
    field: ClientSortField,
    label: string,
    width: number,
    numeric = false
  ) => (
    <th
      className="sortable"
      style={{ width, textAlign: numeric ? "right" : "left" }}
      onClick={() => handleSort(field)}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          justifyContent: numeric ? "flex-end" : "flex-start",
        }}
      >
        {label} <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No client projects</div>
        <div className="empty-state-subtitle">
          Add a client to start tracking what's owed and what's been delivered.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)" }}>
      <table className="data-table" style={{ tableLayout: "fixed", minWidth: 1000 }}>
        <thead>
          <tr>
            {sortableHeader("clientName", "Client", 220)}
            {sortableHeader("status", "Status", 140)}
            {sortableHeader("totalProjectValue", "Total Value", 120, true)}
            {sortableHeader("amountReceived", "Received", 120, true)}
            {sortableHeader("amountOutstanding", "Outstanding", 120, true)}
            {sortableHeader("deliveryCost", "Cost", 110, true)}
            {sortableHeader("netProfit", "Profit", 120, true)}
            <th style={{ width: 90, textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((project) => (
            <tr key={project.id}>
              <td
                style={{ color: "var(--text-primary)", fontWeight: 500, fontFamily: "var(--font-sans)" }}
                title={project.projectDescription ?? undefined}
              >
                {project.clientName}
                {project.projectDescription && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-faint)",
                      fontWeight: 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {project.projectDescription}
                  </div>
                )}
              </td>
              <td>
                {/* Inline status edit — the one field that changes often enough
                    that opening the modal for it would be a chore. */}
                <select
                  className="filter-select"
                  value={project.status}
                  onChange={(e) => onStatusChange(project, e.target.value as ProjectStatus)}
                  aria-label={`Status for ${project.clientName}`}
                  style={{ color: PROJECT_STATUS_MAP[project.status].color, width: "100%" }}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              {money(project.totalProjectValue, "var(--text-primary)")}
              {money(project.amountReceived)}
              {money(
                project.amountOutstanding,
                project.amountOutstanding > 0 ? "var(--accent-amber)" : "var(--text-muted)"
              )}
              {money(project.deliveryCost)}
              {money(
                project.netProfit,
                project.netProfit < 0 ? "var(--accent-red)" : "var(--accent-lime)"
              )}
              <td style={{ textAlign: "center", overflow: "visible" }}>
                <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                  <button
                    className="icon-btn"
                    aria-label={`Edit ${project.clientName}`}
                    onClick={() => onEdit(project)}
                  >
                    <Pencil size={13} />
                  </button>
                  {confirmDeleteId === project.id ? (
                    <button
                      className="btn-danger"
                      style={{ padding: "2px 6px", fontSize: 10 }}
                      onClick={() => {
                        setConfirmDeleteId(null);
                        onDelete(project.id);
                      }}
                      onBlur={() => setConfirmDeleteId(null)}
                      autoFocus
                    >
                      Sure?
                    </button>
                  ) : (
                    <button
                      className="icon-btn"
                      aria-label={`Delete ${project.clientName}`}
                      onClick={() => setConfirmDeleteId(project.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ color: "var(--text-muted)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Total
            </td>
            <td />
            {money(totals.total, "var(--text-primary)")}
            {money(totals.received)}
            {money(totals.outstanding, totals.outstanding > 0 ? "var(--accent-amber)" : "var(--text-muted)")}
            {money(totals.cost)}
            {money(totals.profit, totals.profit < 0 ? "var(--accent-red)" : "var(--accent-lime)")}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
