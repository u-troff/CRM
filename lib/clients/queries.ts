import { createClient } from "@/lib/supabase/client";
import { ClientProject } from "@/types/client";

// ── Row shape (snake_case, as returned by PostgREST) ─────────────────────────
type DbClientProject = {
  id: string;
  client_name: string;
  project_description: string | null;
  total_project_value: number | string | null;
  amount_received: number | string | null;
  amount_outstanding: number | string | null;
  delivery_cost: number | string | null;
  net_profit: number | string | null;
  status: ClientProject["status"];
  created_at: string;
  updated_at: string;
};

// PostgREST can hand back `numeric` as a string to preserve precision, so every
// money column goes through Number() rather than being trusted as-is.
function toNumber(value: number | string | null): number {
  const n = typeof value === "string" ? Number(value) : value;
  return n === null || Number.isNaN(n) ? 0 : n;
}

// ── Mapper ───────────────────────────────────────────────────────────────────
export function mapClientProject(row: DbClientProject): ClientProject {
  return {
    id: row.id,
    clientName: row.client_name,
    projectDescription: row.project_description,
    totalProjectValue: toNumber(row.total_project_value),
    amountReceived: toNumber(row.amount_received),
    amountOutstanding: toNumber(row.amount_outstanding),
    deliveryCost: toNumber(row.delivery_cost),
    netProfit: toNumber(row.net_profit),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Fetchers ─────────────────────────────────────────────────────────────────
export async function fetchClientProjects(): Promise<ClientProject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapClientProject(r as DbClientProject));
}
