"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { OutreachDay } from "@/lib/outreach/queries";

interface OutreachHistoryProps {
  history: OutreachDay[]; // last 30 days, newest first — passed from server component
}

const TARGET = 50;
const TOTAL_TARGET = 150;

// Mirrors the hex values of the CSS custom properties in globals.css —
// recharts sets these as raw SVG attributes, which don't reliably resolve var() in all browsers.
const COLOR_CYAN = "#22d3ee";
const COLOR_AMBER = "#fbbf24";
const COLOR_LIME = "#a3e635";
const COLOR_RED = "#dc2626";
const COLOR_MUTED = "#737373";
const COLOR_BORDER_SUBTLE = "#1f1f1f";

function shortDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function longDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function valueColor(value: number, target: number): string {
  if (value >= target) return "var(--accent-lime)";
  if (value < target / 2) return "var(--accent-red)";
  return "var(--accent-amber)";
}

export default function OutreachHistory({ history }: OutreachHistoryProps) {
  const [tab, setTab] = useState<"chart" | "table">("chart");

  const chronological = [...history].reverse();
  const last14 = chronological.slice(-14);

  const hitCount = history.filter((d) => d.emails + d.dms + d.calls >= TOTAL_TARGET).length;
  const avg = (key: "emails" | "dms" | "calls") =>
    history.length === 0 ? 0 : Math.round(history.reduce((sum, d) => sum + d[key], 0) / history.length);
  const avgTotal =
    history.length === 0
      ? 0
      : Math.round(history.reduce((sum, d) => sum + d.emails + d.dms + d.calls, 0) / history.length);

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
        <button className={`script-tab${tab === "chart" ? " active" : ""}`} onClick={() => setTab("chart")}>
          Chart
        </button>
        <button className={`script-tab${tab === "table" ? " active" : ""}`} onClick={() => setTab("table")}>
          Table
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {tab === "chart" ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={last14}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDER_SUBTLE} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: COLOR_MUTED, fontSize: 10 }} />
                <YAxis tick={{ fill: COLOR_MUTED, fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
                  labelFormatter={(label) => longDate(String(label))}
                  labelStyle={{ color: "var(--text-secondary)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: COLOR_MUTED }} />
                <ReferenceLine y={TARGET} stroke={COLOR_MUTED} strokeDasharray="4 4" label={{ value: "Target", fill: COLOR_MUTED, fontSize: 10, position: "insideTopLeft" }} />
                <Bar dataKey="emails" name="Emails" fill={COLOR_CYAN} />
                <Bar dataKey="dms" name="DMs" fill={COLOR_AMBER} />
                <Bar dataKey="calls" name="Calls" fill={COLOR_LIME} />
              </BarChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={last14.map((d) => ({ date: d.date, total: d.emails + d.dms + d.calls }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDER_SUBTLE} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: COLOR_MUTED, fontSize: 10 }} />
                <YAxis tick={{ fill: COLOR_MUTED, fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
                  labelFormatter={(label) => longDate(String(label))}
                  labelStyle={{ color: "var(--text-secondary)" }}
                />
                <ReferenceLine y={TOTAL_TARGET} stroke={COLOR_MUTED} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="total" name="Total" stroke={COLOR_CYAN} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 10 }}>
              Last 30 days: Days hit target: {hitCount} / {history.length} · Avg emails: {avg("emails")} · Avg DMs:{" "}
              {avg("dms")} · Avg calls: {avg("calls")} · Avg total: {avgTotal}
            </div>
            <div style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Emails</th>
                    <th>DMs</th>
                    <th>Calls</th>
                    <th>Total</th>
                    <th>Hit Target?</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((day) => {
                    const total = day.emails + day.dms + day.calls;
                    const hit = total >= TOTAL_TARGET;
                    return (
                      <tr key={day.id} style={hit ? { background: "rgba(163,230,53,0.04)" } : undefined}>
                        <td>{longDate(day.date)}</td>
                        <td style={{ color: valueColor(day.emails, TARGET) }}>{day.emails}</td>
                        <td style={{ color: valueColor(day.dms, TARGET) }}>{day.dms}</td>
                        <td style={{ color: valueColor(day.calls, TARGET) }}>{day.calls}</td>
                        <td style={{ color: valueColor(total, TOTAL_TARGET) }}>{total}</td>
                        <td style={{ color: hit ? "var(--accent-lime)" : "var(--accent-red)" }}>
                          {hit ? "✓ Yes" : "✗ No"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
