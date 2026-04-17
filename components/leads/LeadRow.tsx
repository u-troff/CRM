"use client";

import { Lead } from "@/types/lead";
import TierBadge from "./TierBadge";
import StatusPill from "./StatusPill";
import { Phone, Star } from "lucide-react";
import { getCallCount, getLastContact } from "@/lib/leads/queries";

interface LeadRowProps {
  lead: Lead;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: () => void;
}

function formatLastContact(ts: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LeadRow({ lead, selected, onSelect, onClick }: LeadRowProps) {
  const callCount = getCallCount(lead);
  const lastContact = getLastContact(lead);

  return (
    <tr
      className={selected ? "selected" : ""}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <td style={{ width: 36, padding: "0 8px 0 12px" }} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(lead.id, e.target.checked)}
          aria-label={`Select ${lead.businessName}`}
          style={{ cursor: "pointer", accentColor: "var(--accent-lime)" }}
        />
      </td>
      <td style={{ width: 48, textAlign: "center" }}>
        <TierBadge tier={lead.tier} />
      </td>
      <td
        style={{
          color: "var(--text-primary)",
          fontWeight: 500,
          fontFamily: "var(--font-sans)",
          maxWidth: 200,
          width: 200,
        }}
      >
        {lead.businessName}
        {lead.isFranchise && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 9,
              color: "var(--text-faint)",
              letterSpacing: "0.05em",
            }}
          >
            FRAN
          </span>
        )}
      </td>
      <td style={{ width: 100, color: "var(--text-muted)", fontSize: 11 }}>
        {lead.ownerName || "—"}
      </td>
      <td style={{ width: 140 }}>
        {lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            className="phone-number"
            style={{ fontSize: 11 }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Call ${lead.businessName}`}
          >
            {lead.phoneRaw || lead.phone}
          </a>
        ) : (
          <span className="phone-missing">
            {lead.phoneRaw?.startsWith("#") ? "ERR" : "MISSING"}
          </span>
        )}
      </td>
      <td style={{ width: 100, fontSize: 11 }}>
        {lead.rating !== null ? (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Star size={10} color="var(--accent-amber)" fill="var(--accent-amber)" />
            {lead.rating.toFixed(1)}
            {lead.reviewCount !== null && (
              <span style={{ color: "var(--text-faint)" }}>
                ({lead.reviewCount})
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: "var(--text-faint)" }}>—</span>
        )}
      </td>
      <td style={{ width: 140 }}>
        <StatusPill status={lead.currentStatus} />
      </td>
      <td style={{ width: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
        {callCount || "—"}
      </td>
      <td style={{ width: 90, color: "var(--text-muted)", fontSize: 11 }}>
        {formatLastContact(lastContact)}
      </td>
    </tr>
  );
}
