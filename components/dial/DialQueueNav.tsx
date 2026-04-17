"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface DialQueueNavProps {
  currentIndex: number;
  total: number;
  tier: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function DialQueueNav({
  currentIndex,
  total,
  tier,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: DialQueueNavProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <button
        className="icon-btn"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous lead"
        style={{ border: "1px solid var(--border-default)", width: 32, height: 32 }}
      >
        <ChevronLeft size={16} />
      </button>

      <div style={{ flex: 1, textAlign: "center" }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          Lead {currentIndex + 1} of {total}
        </span>
        {" — "}
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color:
              tier === "TIER 1"
                ? "var(--accent-lime)"
                : tier === "TIER 2"
                ? "var(--accent-amber)"
                : "var(--text-muted)",
            fontWeight: 700,
          }}
        >
          {tier}
        </span>
      </div>

      <button
        className="icon-btn"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next lead"
        style={{ border: "1px solid var(--border-default)", width: 32, height: 32 }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
