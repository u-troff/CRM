"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Lead, CallStatus } from "@/types/lead";
import { updateLead } from "@/lib/leads/mutations";
import { KANBAN_COLUMNS, getColumnIdForStatus } from "@/lib/constants/kanban";
import KanbanColumn from "./KanbanColumn";

interface KanbanBoardProps {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
}

export default function KanbanBoard({ leads, loading, error, reload, onDeleteLead }: KanbanBoardProps) {
  const [boardLeads, setBoardLeads] = useState<Lead[]>([]);

  useEffect(() => {
    setBoardLeads(leads);
  }, [leads]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination || destination.droppableId === source.droppableId) return;

      const column = KANBAN_COLUMNS.find((c) => c.id === destination.droppableId);
      if (!column) return;
      const newStatus: CallStatus = column.status ?? "new";
      const updatedAt = Date.now();

      setBoardLeads((prev) =>
        prev.map((lead) => (lead.id === draggableId ? { ...lead, currentStatus: newStatus, updatedAt } : lead))
      );

      updateLead(draggableId, { currentStatus: newStatus, updatedAt }).catch(() => {
        reload();
      });
    },
    [reload]
  );

  const handleDelete = useCallback(
    (id: string) => {
      setBoardLeads((prev) => prev.filter((lead) => lead.id !== id));
      onDeleteLead(id).catch(() => reload());
    },
    [onDeleteLead, reload]
  );

  if (loading) {
    return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading...</div>;
  }

  return (
    <>
      {error && (
        <div className="error-banner" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              leads={boardLeads.filter((lead) => getColumnIdForStatus(lead.currentStatus) === column.id)}
              onDeleteLead={handleDelete}
            />
          ))}
        </div>
      </DragDropContext>
    </>
  );
}
