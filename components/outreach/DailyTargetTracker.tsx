"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { adjustTodayCount, resetTodayCounts } from "@/lib/outreach/mutations";
import { createClient } from "@/lib/supabase/client";

const TARGET = 50;
const TOTAL_TARGET = 150;
const CHANNELS = [
  { key: "emails" as const, label: "Cold Emails" },
  { key: "dms" as const, label: "LinkedIn / DMs" },
  { key: "calls" as const, label: "Cold Calls" },
] as const;

type Channel = (typeof CHANNELS)[number]["key"];

interface DailyTargetTrackerProps {
  initialData: { emails: number; dms: number; calls: number } | null;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

function fillColor(value: number, target: number): string {
  if (value >= target) return "var(--accent-lime)";
  if (value >= target / 2) return "var(--accent-amber)";
  return "var(--accent-red)";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

export default function DailyTargetTracker({
  initialData,
  collapsible = false,
  defaultCollapsed = false,
}: DailyTargetTrackerProps) {
  const [counts, setCounts] = useState({
    emails: initialData?.emails ?? 0,
    dms: initialData?.dms ?? 0,
    calls: initialData?.calls ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);

  const queueRef = useRef<Record<Channel, Promise<void>>>({
    emails: Promise.resolve(),
    dms: Promise.resolve(),
    calls: Promise.resolve(),
  });
  const inFlightCountRef = useRef(0);

  // TODO: enable Supabase realtime for cross-device sync — see STEP 6 in implementation notes

  // Pages that render this client-side (no server-fetched initialData) hydrate on mount.
  useEffect(() => {
    if (initialData) return;
    (async () => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("outreach_targets")
        .select("emails, dms, calls")
        .eq("date", today)
        .maybeSingle();
      if (data) setCounts({ emails: data.emails, dms: data.dms, calls: data.calls });
    })();
  }, [initialData]);

  const handleAdjust = useCallback((channel: Channel, delta: 1 | -1) => {
    setError(null);
    setCounts((prev) => ({ ...prev, [channel]: Math.max(0, prev[channel] + delta) }));

    const previous = queueRef.current[channel];
    const next = previous.then(async () => {
      inFlightCountRef.current++;
      setSaving(true);
      try {
        const result = await adjustTodayCount(channel, delta);
        setCounts((prev) => ({ ...prev, [channel]: result[channel] }));
      } catch (e) {
        setCounts((prev) => ({ ...prev, [channel]: Math.max(0, prev[channel] - delta) }));
        setError(e instanceof Error ? e.message : "Failed to save. Try again.");
      } finally {
        inFlightCountRef.current--;
        if (inFlightCountRef.current === 0) setSaving(false);
      }
    });
    queueRef.current[channel] = next;
  }, []);

  const handleReset = useCallback(async () => {
    if (!window.confirm("Reset all of today's counts to zero?")) return;
    try {
      await resetTodayCounts();
      setCounts({ emails: 0, dms: 0, calls: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset. Try again.");
    }
  }, []);

  const total = counts.emails + counts.dms + counts.calls;

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
          Daily Targets
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saving && (
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Saving...
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
              const color = fillColor(value, TARGET);
              return (
                <div key={key}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        className="icon-btn"
                        aria-label={`Decrement ${label.toLowerCase()}`}
                        onClick={() => handleAdjust(key, -1)}
                        disabled={saving || value === 0}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color, minWidth: 48, textAlign: "center" }}>
                        {value} / {TARGET}
                      </span>
                      <button
                        className="icon-btn"
                        aria-label={`Increment ${label.toLowerCase()}`}
                        onClick={() => handleAdjust(key, 1)}
                        disabled={saving}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ height: 3, background: "var(--border-subtle)", marginTop: 6 }}>
                    <div
                      style={{
                        height: 3,
                        width: `${Math.min(100, (value / TARGET) * 100)}%`,
                        background: color,
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 14, paddingTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Total Touches
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: fillColor(total, TOTAL_TARGET) }}>
                {total} / {TOTAL_TARGET}
              </span>
            </div>
            <div style={{ height: 3, background: "var(--border-subtle)", marginTop: 6 }}>
              <div
                style={{
                  height: 3,
                  width: `${Math.min(100, (total / TOTAL_TARGET) * 100)}%`,
                  background: fillColor(total, TOTAL_TARGET),
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              onClick={handleReset}
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
