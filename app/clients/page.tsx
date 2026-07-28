"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import { ClientProject, ClientProjectInput, ProjectStatus } from "@/types/client";
import { useClientProjects } from "@/hooks/useClientProjects";
import {
  createClientProject,
  updateClientProject,
  updateProjectStatus,
  deleteClientProject,
} from "@/lib/clients/mutations";
import TopBar from "@/components/layout/TopBar";
import ClientFilters, { ClientFilterState } from "@/components/clients/ClientFilters";
import ClientProjectsTable from "@/components/clients/ClientProjectsTable";
import ClientFormModal from "@/components/clients/ClientFormModal";

function matchesFilter(project: ClientProject, f: ClientFilterState): boolean {
  if (f.status !== "all" && project.status !== f.status) return false;
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    const haystack = [project.clientName, project.projectDescription]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export default function ClientsPage() {
  const { projects, loading, error, reload, patchProject, removeProject, restore } =
    useClientProjects();

  const [filters, setFilters] = useState<ClientFilterState>({ search: "", status: "all" });
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(
    () => projects.filter((p) => matchesFilter(p, filters)),
    [projects, filters]
  );
  const editingProject = projects.find((p) => p.id === editingId) ?? null;

  const handleCreate = useCallback(
    async (input: ClientProjectInput) => {
      const created = await createClientProject(input);
      patchProject(created);
      reload();
    },
    [patchProject, reload]
  );

  const handleUpdate = useCallback(
    async (id: string, input: ClientProjectInput) => {
      const updated = await updateClientProject(id, input);
      patchProject(updated);
    },
    [patchProject]
  );

  const handleStatusChange = useCallback(
    async (project: ClientProject, status: ProjectStatus) => {
      const snapshot = patchProject({ ...project, status });
      try {
        await updateProjectStatus(project.id, status);
      } catch {
        restore(snapshot);
      }
    },
    [patchProject, restore]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const snapshot = removeProject(id);
      if (editingId === id) setEditingId(null);
      try {
        await deleteClientProject(id);
      } catch {
        restore(snapshot);
      }
    },
    [removeProject, restore, editingId]
  );

  return (
    <>
      <TopBar title="Clients">
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={13} />
          Add Client
        </button>
      </TopBar>

      <div className="page-content">
        <ClientFilters value={filters} onChange={setFilters} />

        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <ClientProjectsTable
            projects={filtered}
            onEdit={(project) => setEditingId(project.id)}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )}
      </div>

      {addOpen && (
        <ClientFormModal onClose={() => setAddOpen(false)} onSave={handleCreate} />
      )}

      {editingProject && (
        <ClientFormModal
          project={editingProject}
          onClose={() => setEditingId(null)}
          onSave={(input) => handleUpdate(editingProject.id, input)}
        />
      )}
    </>
  );
}
