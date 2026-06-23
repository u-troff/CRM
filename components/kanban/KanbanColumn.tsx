"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Lead } from "@/types/lead";
import { KanbanColumnDef } from "@/lib/constants/kanban";
import KanbanCard from "./KanbanCard";

interface KanbanColumnProps {
  column: KanbanColumnDef;
  leads: Lead[];
  onDeleteLead: (id: string) => void;
}

export default function KanbanColumn({ column, leads, onDeleteLead }: KanbanColumnProps) {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        width: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          borderTop: `2px solid ${column.color ?? "transparent"}`,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: column.color ?? "var(--text-muted)",
          }}
        >
          {column.label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-muted)",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-default)",
            borderRadius: 999,
            padding: "1px 7px",
          }}
        >
          {leads.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              height: "calc(100vh - 180px)",
              overflowY: "auto",
              padding: 8,
              background: snapshot.isDraggingOver ? "rgba(163,230,53,0.04)" : undefined,
            }}
          >
            {leads.map((lead, index) => (
              <KanbanCard key={lead.id} lead={lead} index={index} onDelete={onDeleteLead} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
