"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Trash2, Search, X } from "lucide-react";
import { Lead } from "@/types/lead";
import TierBadge from "@/components/leads/TierBadge";
import LeadIntelligencePanel from "@/components/intelligence/LeadIntelligencePanel";

interface KanbanCardProps {
  lead: Lead;
  index: number;
  onDelete: (id: string) => void;
}

export default function KanbanCard({ lead, index, onDelete }: KanbanCardProps) {
  const emailDotColor = lead.emailQuality === "good" ? "var(--accent-lime)" : "var(--accent-red)";
  const location = [lead.city, lead.state].filter(Boolean).join(", ");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            background: "var(--bg-panel)",
            border: `1px solid ${snapshot.isDragging ? "var(--accent-lime)" : "var(--border-default)"}`,
            padding: "10px 12px",
            marginBottom: 8,
            cursor: "grab",
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
              }}
            >
              {lead.businessName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span
                title={lead.emailQuality === "good" ? "Good email" : "Bad or missing email"}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: emailDotColor,
                  marginTop: 4,
                }}
              />
              <button
                className="icon-btn"
                aria-label={`Research ${lead.businessName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerOpen(true);
                }}
                style={{ padding: 0 }}
              >
                <Search size={12} />
              </button>
              <button
                className="icon-btn"
                aria-label={`Delete ${lead.businessName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(lead.id);
                }}
                style={{ padding: 0 }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {lead.ownerName && (
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{lead.ownerName}</div>
          )}

          {location && <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 6 }}>{location}</div>}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
              {lead.phoneRaw || lead.phone || "—"}
            </span>
            <TierBadge tier={lead.tier} />
          </div>

          {drawerOpen && (
            <div
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                width: "min(460px, 100vw)",
                height: "100vh",
                background: "var(--bg-panel)",
                borderLeft: "1px solid var(--border-default)",
                overflowY: "auto",
                zIndex: 100,
                padding: 24,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button className="icon-btn" aria-label="Close research panel" onClick={() => setDrawerOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <LeadIntelligencePanel leadId={lead.id} leadName={lead.businessName} ownerName={lead.ownerName} />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
