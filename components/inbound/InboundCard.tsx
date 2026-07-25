"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Trash2, CalendarClock } from "lucide-react";
import { InboundLead } from "@/types/inbound";
import { isFollowupDue, formatFollowupDate } from "@/lib/inbound/date";
import SourceTag from "./SourceTag";

interface InboundCardProps {
  lead: InboundLead;
  index: number;
  onSelect: (lead: InboundLead) => void;
  onDelete: (id: string) => void;
}

export default function InboundCard({ lead, index, onSelect, onDelete }: InboundCardProps) {
  const due = isFollowupDue(lead.nextFollowupAt);

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelect(lead)}
          style={{
            background: "var(--bg-panel)",
            border: `1px solid ${snapshot.isDragging ? "var(--accent-cyan)" : "var(--border-default)"}`,
            padding: "10px 12px",
            marginBottom: 8,
            cursor: "pointer",
            ...provided.draggableProps.style,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {lead.fullName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <SourceTag source={lead.source} />
              <button
                className="icon-btn"
                aria-label={`Delete ${lead.fullName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(lead.id);
                }}
                style={{ padding: 0, width: 18, height: 18 }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {lead.businessName && (
            <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 4 }}>
              {lead.businessName}
            </div>
          )}

          {lead.phone && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 6,
              }}
            >
              {lead.phone}
            </div>
          )}

          {lead.nextFollowupAt && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginTop: 8,
                fontSize: 10,
                fontWeight: due ? 700 : 500,
                color: due ? "var(--accent-cyan)" : "var(--text-muted)",
              }}
            >
              <CalendarClock size={11} />
              {due ? "Due" : "Follow up"} {formatFollowupDate(lead.nextFollowupAt)}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
