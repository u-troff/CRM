"use client";

import { Lead } from "@/types/lead";
import { STATUS_META } from "@/lib/constants/statuses";

interface CallHistoryProps {
  lead: Lead;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CallHistory({ lead }: CallHistoryProps) {
  const sorted = [...lead.history].sort((a, b) => b.timestamp - a.timestamp);

  if (sorted.length === 0) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: 12, padding: "8px 0" }}>
        No calls logged yet.
      </div>
    );
  }

  return (
    <div>
      {sorted.map((attempt, i) => {
        const meta = STATUS_META[attempt.status];
        return (
          <div key={attempt.id} className="call-attempt">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50% !important",
                  background: meta.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: meta.color,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {meta.label}
              </span>
              <span style={{ color: "var(--text-faint)", fontSize: 10 }}>
                {formatTs(attempt.timestamp)}
              </span>
            </div>
            {attempt.notes && (
              <div
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 11,
                  lineHeight: 1.5,
                  paddingLeft: 16,
                }}
              >
                {attempt.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
