import { ProjectStatus } from "@/types/client";

// ── Project delivery statuses ────────────────────────────────────────────────
export interface ProjectStatusDef {
  id: ProjectStatus;
  label: string;
  color: string; // hex, used for the pill text/border
  bgColor: string; // subtle background for the pill
}

// Order is the delivery order — the table sorts on this index, not the label.
export const PROJECT_STATUSES: ProjectStatusDef[] = [
  {
    id: "not_started",
    label: "Not Started",
    color: "#737373",
    bgColor: "rgba(115,115,115,0.15)",
  },
  {
    id: "in_progress",
    label: "In Progress",
    color: "#22d3ee",
    bgColor: "rgba(34,211,238,0.15)",
  },
  {
    id: "delivered",
    label: "Delivered",
    color: "#fbbf24",
    bgColor: "rgba(251,191,36,0.15)",
  },
  {
    id: "paid_in_full",
    label: "Paid in Full",
    color: "#a3e635",
    bgColor: "rgba(163,230,53,0.15)",
  },
];

export const PROJECT_STATUS_MAP: Record<ProjectStatus, ProjectStatusDef> =
  Object.fromEntries(PROJECT_STATUSES.map((s) => [s.id, s])) as Record<
    ProjectStatus,
    ProjectStatusDef
  >;

export const PROJECT_STATUS_ORDER: Record<ProjectStatus, number> =
  Object.fromEntries(PROJECT_STATUSES.map((s, i) => [s.id, i])) as Record<
    ProjectStatus,
    number
  >;
