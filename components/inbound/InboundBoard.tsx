"use client";

import { useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { InboundLead, InboundStage } from "@/types/inbound";
import { INBOUND_COLUMNS } from "@/lib/constants/inbound";
import InboundColumn from "./InboundColumn";

interface InboundBoardProps {
  leads: InboundLead[];
  onSelect: (lead: InboundLead) => void;
  onDelete: (id: string) => void;
  onStageChange: (lead: InboundLead, newStage: InboundStage) => void;
}

export default function InboundBoard({ leads, onSelect, onDelete, onStageChange }: InboundBoardProps) {
  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination || destination.droppableId === source.droppableId) return;

      const newStage = destination.droppableId as InboundStage;
      const lead = leads.find((l) => l.id === draggableId);
      if (!lead || lead.stage === newStage) return;

      onStageChange(lead, newStage);
    },
    [leads, onStageChange]
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {INBOUND_COLUMNS.map((column) => (
          <InboundColumn
            key={column.id}
            column={column}
            leads={leads.filter((lead) => lead.stage === column.id)}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
