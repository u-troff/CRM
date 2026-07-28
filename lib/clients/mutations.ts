import { createClient } from "@/lib/supabase/client";
import { ClientProject, ClientProjectInput, ProjectStatus } from "@/types/client";
import { mapClientProject } from "./queries";

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// Trim empty strings down to null so optional columns stay clean.
function nullify(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

// `amount_outstanding` and `net_profit` are generated columns — Postgres
// computes them and rejects writes, so they never appear in these payloads.
function toRow(input: ClientProjectInput) {
  return {
    client_name: input.clientName.trim(),
    project_description: nullify(input.projectDescription),
    total_project_value: input.totalProjectValue,
    amount_received: input.amountReceived,
    delivery_cost: input.deliveryCost,
    status: input.status,
  };
}

export async function createClientProject(
  input: ClientProjectInput
): Promise<ClientProject> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("client_projects")
    .insert({ user_id: userId, ...toRow(input) })
    .select("*")
    .single();

  if (error) throw error;
  return mapClientProject(data);
}

export async function updateClientProject(
  id: string,
  input: ClientProjectInput
): Promise<ClientProject> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_projects")
    .update(toRow(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapClientProject(data);
}

// Quick status change straight from the table row.
export async function updateProjectStatus(
  id: string,
  status: ProjectStatus
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("client_projects")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClientProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("client_projects").delete().eq("id", id);
  if (error) throw error;
}
