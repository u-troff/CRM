import { CallStatus } from "@/types/lead";

export interface KanbanColumnDef {
  id: string; // droppableId
  label: string;
  color: string | null;
  statuses: CallStatus[]; // every status that belongs in this column
  writeStatus: CallStatus; // status written when a card is manually dropped into this column
}

// Every CallStatus value (Kanban pipeline stages AND Dial Mode call outcomes)
// is bucketed into exactly one column below. This keeps the two pages in
// sync: logging an outcome in Dial Mode (e.g. "Voicemail") moves the card
// into "In Progress" on the board instead of leaving it stuck in a column
// that never reflects dial activity.
export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: "new",
    label: "New",
    color: null,
    statuses: ["new"],
    writeStatus: "new",
  },
  {
    id: "in_progress",
    label: "In Progress",
    color: "var(--accent-cyan)",
    statuses: ["called", "no_answer", "voicemail", "gatekeeper", "callback", "nurture"],
    writeStatus: "called",
  },
  {
    id: "booked",
    label: "Booked",
    color: "var(--accent-amber)",
    statuses: ["discovery_booked", "booked"],
    writeStatus: "booked",
  },
  {
    id: "won",
    label: "Won / Paid",
    color: "var(--accent-lime)",
    statuses: ["closed_won", "sold"],
    writeStatus: "sold",
  },
  {
    id: "lost",
    label: "Lost",
    color: "var(--accent-red)",
    statuses: ["not_interested", "wrong_number", "dnc", "closed_lost", "lost"],
    writeStatus: "lost",
  },
];

export function getColumnIdForStatus(status: CallStatus): string {
  const column = KANBAN_COLUMNS.find((c) => c.statuses.includes(status));
  return column ? column.id : "new";
}
