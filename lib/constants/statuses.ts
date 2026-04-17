import { CallStatus } from "@/types/lead";

export interface StatusMeta {
  label: string;
  color: string; // hex
  bgColor: string; // subtle background for pills
  shortcut?: number; // keyboard shortcut 1–9 in dial mode
}

export const STATUS_META: Record<CallStatus, StatusMeta> = {
  new: {
    label: "New",
    color: "#6b7280",
    bgColor: "rgba(107,114,128,0.15)",
    shortcut: 1,
  },
  no_answer: {
    label: "No Answer",
    color: "#9ca3af",
    bgColor: "rgba(156,163,175,0.15)",
    shortcut: 2,
  },
  voicemail: {
    label: "Voicemail",
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.15)",
    shortcut: 3,
  },
  gatekeeper: {
    label: "Gatekeeper",
    color: "#fbbf24",
    bgColor: "rgba(251,191,36,0.15)",
    shortcut: 4,
  },
  callback: {
    label: "Callback",
    color: "#60a5fa",
    bgColor: "rgba(96,165,250,0.15)",
    shortcut: 5,
  },
  not_interested: {
    label: "Not Interested",
    color: "#f87171",
    bgColor: "rgba(248,113,113,0.15)",
    shortcut: 6,
  },
  nurture: {
    label: "Nurture",
    color: "#34d399",
    bgColor: "rgba(52,211,153,0.15)",
    shortcut: 7,
  },
  discovery_booked: {
    label: "Discovery Booked",
    color: "#22d3ee",
    bgColor: "rgba(34,211,238,0.15)",
    shortcut: 8,
  },
  wrong_number: {
    label: "Wrong Number",
    color: "#737373",
    bgColor: "rgba(115,115,115,0.15)",
    shortcut: 9,
  },
  dnc: {
    label: "Do Not Call",
    color: "#dc2626",
    bgColor: "rgba(220,38,38,0.15)",
  },
  closed_won: {
    label: "Closed Won",
    color: "#a3e635",
    bgColor: "rgba(163,230,53,0.15)",
  },
  closed_lost: {
    label: "Closed Lost",
    color: "#525252",
    bgColor: "rgba(82,82,82,0.15)",
  },
};

// Statuses excluded from the dial queue
export const EXCLUDED_FROM_QUEUE: CallStatus[] = [
  "dnc",
  "wrong_number",
  "closed_won",
  "closed_lost",
  "not_interested",
];

// Statuses available as outcome buttons in dial mode (all except 'new')
export const DIAL_OUTCOME_STATUSES: CallStatus[] = [
  "no_answer",
  "voicemail",
  "gatekeeper",
  "callback",
  "not_interested",
  "nurture",
  "discovery_booked",
  "wrong_number",
  "dnc",
  "closed_won",
  "closed_lost",
];

// All statuses in display order
export const ALL_STATUSES: CallStatus[] = [
  "new",
  "callback",
  "nurture",
  "discovery_booked",
  "no_answer",
  "voicemail",
  "gatekeeper",
  "not_interested",
  "wrong_number",
  "dnc",
  "closed_won",
  "closed_lost",
];
