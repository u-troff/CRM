"use client";

import { Minus, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useDailyOutreachLog } from "@/hooks/useDailyOutreachLog";
import { CHANNELS, TOUCH_CHANNELS } from "@/lib/outreach/constants";
import type { DailyOutreachLog } from "@/lib/outreach/queries";
import { useState } from "react";

interface DailyTargetTrackerProps {
  initialData: DailyOutreachLog | null;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showNotes?: boolean;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Johannesburg",
  });
}

export default function DailyTargetTracker({
  initialData,
  collapsible = false,
  defaultCollapsed = false,
  showNotes = false,
}: DailyTargetTrackerProps) {
  const { counts, notes, saving, savedAt, error, adjust, setNotes, resetAll } = useDailyOutreachLog(initialData);
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);

  const touchTotal = TOUCH_CHANNELS.reduce((sum, key) => sum + counts[key], 0);
  const justSaved = savedAt !== null && Date.now() - savedAt < 2000;

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: collapsed ? 0 : 12,
          cursor: collapsible ? "pointer" : "default",
        }}
        onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
      >
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Today&apos;s Outreach
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saving && (
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Saving...
            </span>
          )}
          {!saving && justSaved && (
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent-lime)" }}>
              Saved
            </span>
          )}
          <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            {todayLabel()}
          </span>
          {collapsible && (collapsed ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronUp size={13} color="var(--text-muted)" />)}
        </div>
      </div>

      {!collapsed && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CHANNELS.map(({ key, label }) => {
              const value = counts[key];
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      className="icon-btn"
                      aria-label={`Decrement ${label.toLowerCase()}`}
                      onClick={() => adjust(key, -1)}
                      disabled={value === 0}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", minWidth: 24, textAlign: "center" }}>
                      {value}
                    </span>
                    <button className="icon-btn" aria-label={`Increment ${label.toLowerCase()}`} onClick={() => adjust(key, 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 14, paddingTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Today&apos;s Total Touches
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent-cyan)" }}>{touchTotal}</span>
            </div>
          </div>

          {showNotes && (
            <div style={{ marginTop: 12 }}>
              <textarea
                className="form-input"
                placeholder="Notes for today..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{ fontSize: 12 }}
              />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              onClick={() => {
                if (window.confirm("Reset all of today's counts to zero?")) resetAll();
              }}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}
            >
              Reset today
            </button>
          </div>

          {error && <div style={{ color: "var(--accent-red)", fontSize: 11, marginTop: 4 }}>{error}</div>}
        </>
      )}
    </div>
  );
}
