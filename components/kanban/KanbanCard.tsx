"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Trash2, Phone } from "lucide-react";
import { Lead } from "@/types/lead";
import TierBadge from "@/components/leads/TierBadge";
import StatusPill from "@/components/leads/StatusPill";
import KanbanLeadModal from "./KanbanLeadModal";
import { getCallCount, getLastContact } from "@/lib/leads/queries";

interface KanbanCardProps {
  lead: Lead;
  index: number;
  onDelete: (id: string) => void;
  onLeadUpdated: (updated: Lead) => void;
}

function formatLastContact(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function KanbanCard({ lead, index, onDelete, onLeadUpdated }: KanbanCardProps) {
  const emailDotColor = lead.emailQuality === "good" ? "var(--accent-lime)" : "var(--accent-red)";
  const location = [lead.city, lead.state].filter(Boolean).join(", ");
  const [modalOpen, setModalOpen] = useState(false);
  const callCount = getCallCount(lead);
  const lastContact = getLastContact(lead);

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setModalOpen(true)}
          style={{
            background: "var(--bg-panel)",
            border: `1px solid ${snapshot.isDragging ? "var(--accent-lime)" : "var(--border-default)"}`,
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
              <a
                href={`/dial/${lead.id}`}
                className="icon-btn"
                aria-label={`Call ${lead.businessName} in Dial Mode`}
                title="Open in Dial Mode"
                onClick={(e) => e.stopPropagation()}
                style={{ padding: 0 }}
              >
                <Phone size={12} />
              </a>
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <StatusPill status={lead.currentStatus} />
            <span style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "right" }}>
              {callCount > 0
                ? `${callCount} call${callCount === 1 ? "" : "s"}${lastContact ? ` · ${formatLastContact(lastContact)}` : ""}`
                : "Not called yet"}
            </span>
          </div>

          {modalOpen && (
            <KanbanLeadModal lead={lead} onClose={() => setModalOpen(false)} onLeadUpdated={onLeadUpdated} />
          )}
        </div>
      )}
    </Draggable>
  );
}
