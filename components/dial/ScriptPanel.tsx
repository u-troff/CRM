"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { COLD_CALL_SCRIPT, ScriptSection } from "@/lib/script/coldCallScript";

// Tab order
const TABS: { key: ScriptSection; label: string }[] = [
  { key: "greeting", label: "Greeting" },
  { key: "patternBreak", label: "Pattern Break" },
  { key: "validation", label: "Validation" },
  { key: "solution", label: "Solution" },
  { key: "close", label: "Close" },
  { key: "objections", label: "Objections" },
];

export default function ScriptPanel() {
  const [activeTab, setActiveTab] = useState<ScriptSection>("greeting");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        className="btn-secondary"
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: collapsed ? 0 : 0,
          fontSize: 11,
        }}
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label="Toggle script panel"
      >
        <span style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Script Reference
        </span>
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>

      {!collapsed && (
        <div style={{ border: "1px solid var(--border-subtle)", borderTop: "none" }}>
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-subtle)",
              overflowX: "auto",
            }}
          >
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                className={`script-tab${activeTab === key ? " active" : ""}`}
                onClick={() => setActiveTab(key)}
                aria-selected={activeTab === key}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: "14px 16px" }}>
            {activeTab !== "objections" ? (
              (() => {
                const section = COLD_CALL_SCRIPT[activeTab] as {
                  title: string;
                  note: string;
                  lines: readonly string[];
                };
                return (
                  <div>
                    {section.note && (
                      <div
                        style={{
                          color: "var(--text-faint)",
                          fontSize: 11,
                          fontStyle: "italic",
                          marginBottom: 12,
                          lineHeight: 1.5,
                          borderLeft: "2px solid var(--accent-amber)",
                          paddingLeft: 10,
                        }}
                      >
                        {section.note}
                      </div>
                    )}
                    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {section.lines.map((line, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            gap: 10,
                            marginBottom: 10,
                            fontSize: 12,
                            lineHeight: 1.6,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--accent-lime)",
                              fontWeight: 700,
                              minWidth: 16,
                              fontSize: 10,
                              paddingTop: 3,
                            }}
                          >
                            {i + 1}.
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })()
            ) : (
              <div>
                <div
                  style={{
                    color: "var(--text-faint)",
                    fontSize: 11,
                    fontStyle: "italic",
                    marginBottom: 12,
                    lineHeight: 1.5,
                    borderLeft: "2px solid var(--accent-amber)",
                    paddingLeft: 10,
                  }}
                >
                  {COLD_CALL_SCRIPT.objections.note}
                </div>
                {COLD_CALL_SCRIPT.objections.items.map((obj, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 16,
                      padding: "10px 12px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--accent-red)",
                        fontSize: 11,
                        fontWeight: 600,
                        marginBottom: 6,
                        letterSpacing: "0.02em",
                      }}
                    >
                      ↗ {obj.trigger}
                    </div>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      {obj.response}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
