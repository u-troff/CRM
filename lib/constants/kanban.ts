import { CallStatus } from "@/types/lead";

export interface KanbanColumnDef {
  id: string; // droppableId, and the lead.currentStatus value to write on drop (except "backlog")
  label: string;
  status: CallStatus | null; // null = backlog catch-all, writes back "new"
  color: string | null;
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: "backlog", label: "Backlog", status: null, color: null },
  { id: "called", label: "Called", status: "called", color: "var(--accent-cyan)" },
  { id: "booked", label: "Booked", status: "booked", color: "var(--accent-amber)" },
  { id: "sold", label: "Sold / Paid", status: "sold", color: "var(--accent-lime)" },
  { id: "lost", label: "Lost", status: "lost", color: "var(--accent-red)" },
];

const KNOWN_STATUSES: ReadonlySet<CallStatus> = new Set(["called", "booked", "sold", "lost"]);

export function getColumnIdForStatus(status: CallStatus): string {
  return KNOWN_STATUSES.has(status) ? status : "backlog";
}
