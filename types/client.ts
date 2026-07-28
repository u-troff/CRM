// ── Client projects domain types ────────────────────────────────────────────

export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "delivered"
  | "paid_in_full";

export interface ClientProject {
  id: string;
  clientName: string;
  projectDescription: string | null;
  totalProjectValue: number;
  amountReceived: number;
  amountOutstanding: number; // generated in Postgres: total - received
  deliveryCost: number;
  netProfit: number; // generated in Postgres: total - cost
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

// Values accepted by the add/edit form. The two derived columns are omitted —
// Postgres computes them, writing them back would be rejected.
export interface ClientProjectInput {
  clientName: string;
  projectDescription: string;
  totalProjectValue: number;
  amountReceived: number;
  deliveryCost: number;
  status: ProjectStatus;
}
