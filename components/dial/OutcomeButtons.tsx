"use client";

import { CallStatus } from "@/types/lead";
import { DIAL_OUTCOME_STATUSES, STATUS_META } from "@/lib/constants/statuses";

interface OutcomeButtonsProps {
  onOutcome: (status: CallStatus) => void;
  disabled?: boolean;
}

export default function OutcomeButtons({ onOutcome, disabled }: OutcomeButtonsProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        Log Outcome{" "}
        <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>
          (keyboard: 1–9)
        </span>
      </div>
      <div className="outcome-grid">
        {DIAL_OUTCOME_STATUSES.map((status, idx) => {
          const meta = STATUS_META[status];
          const key = meta.shortcut;
          return (
            <button
              key={status}
              className="outcome-btn"
              style={{ color: meta.color, borderColor: meta.color }}
              onClick={() => onOutcome(status)}
              disabled={disabled}
              aria-label={`Log outcome: ${meta.label}`}
              id={`outcome-btn-${status}`}
            >
              {key && <span className="outcome-btn-key">[{key}]</span>}
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
