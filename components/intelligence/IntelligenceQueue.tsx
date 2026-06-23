"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import LeadIntelligencePanel from "@/components/intelligence/LeadIntelligencePanel";

interface IntelligenceRow {
  status: "pending" | "running" | "done" | "error";
  scraped_at: string | null;
  cold_call_intro: string | null;
  cold_email_intro: string | null;
}

interface QueueLead {
  id: string;
  business_name: string;
  owner_name: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  // Supabase's untyped client infers embedded relations as arrays at the type
  // level even though the `lead_id unique` constraint makes this a to-one
  // relationship at runtime (Postgrest embeds it as a single object) — accept
  // either shape and normalize via getIntel().
  lead_intelligence: IntelligenceRow | IntelligenceRow[] | null;
}

interface IntelligenceQueueProps {
  leads: QueueLead[];
}

type RowStatus = "not_researched" | "running" | "done" | "error";

function getIntel(lead: QueueLead): IntelligenceRow | null {
  const intel = lead.lead_intelligence;
  if (Array.isArray(intel)) return intel[0] ?? null;
  return intel;
}

function rowStatus(lead: QueueLead): RowStatus {
  const status = getIntel(lead)?.status;
  if (status === "running") return "running";
  if (status === "done") return "done";
  if (status === "error") return "error";
  return "not_researched";
}

const STATUS_LABEL: Record<RowStatus, string> = {
  not_researched: "Not researched",
  running: "Running...",
  done: "Done ✓",
  error: "Error",
};

const STATUS_COLOR: Record<RowStatus, string> = {
  not_researched: "var(--text-muted)",
  running: "var(--accent-amber)",
  done: "var(--accent-lime)",
  error: "var(--accent-red)",
};

export default function IntelligenceQueue({ leads: initialLeads }: IntelligenceQueueProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    return () => {
      Object.values(pollRefs.current).forEach((interval) => clearInterval(interval));
    };
  }, []);

  const patchLead = useCallback((id: string, intel: Partial<IntelligenceRow>) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              lead_intelligence: {
                ...(getIntel(l) ?? { status: "pending", scraped_at: null, cold_call_intro: null, cold_email_intro: null }),
                ...intel,
              },
            }
          : l
      )
    );
  }, []);

  const pollLead = useCallback(
    (id: string) => {
      let count = 0;
      pollRefs.current[id] = setInterval(async () => {
        count++;
        if (count > 60) {
          clearInterval(pollRefs.current[id]);
          delete pollRefs.current[id];
          patchLead(id, { status: "error" });
          return;
        }
        try {
          const res = await fetch(`/api/intelligence/${id}/status`);
          const data = await res.json();
          const found = data.intelligence;
          if (found?.status === "done" || found?.status === "error") {
            clearInterval(pollRefs.current[id]);
            delete pollRefs.current[id];
            patchLead(id, found);
          }
        } catch {
          // keep polling
        }
      }, 3000);
    },
    [patchLead]
  );

  const handleResearch = useCallback(
    async (id: string) => {
      patchLead(id, { status: "running" });
      try {
        const res = await fetch(`/api/intelligence/${id}/trigger`, { method: "POST" });
        if (res.status === 202 || res.status === 409) {
          pollLead(id);
        } else {
          patchLead(id, { status: "error" });
        }
      } catch {
        patchLead(id, { status: "error" });
      }
    },
    [patchLead, pollLead]
  );

  const researched = leads.filter((l) => rowStatus(l) === "done").length;
  const running = leads.filter((l) => rowStatus(l) === "running").length;
  const notResearched = leads.filter((l) => rowStatus(l) === "not_researched").length;

  return (
    <>
      <TopBar title="Intelligence" />
      <div className="page-content">
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 12 }}>
          {researched} researched · {running} running · {notResearched} not researched · Total: {leads.length} leads
        </div>

        <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Intro Preview</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const status = rowStatus(lead);
                const intro = getIntel(lead)?.cold_call_intro;
                return (
                  <tr key={lead.id} style={{ cursor: "pointer" }} onClick={() => setDrawerLeadId(lead.id)}>
                    <td>
                      <div style={{ color: "var(--text-primary)" }}>{lead.business_name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        {[lead.city, lead.state].filter(Boolean).join(", ")}
                      </div>
                    </td>
                    <td>{lead.owner_name || "—"}</td>
                    <td>
                      <span
                        style={{
                          color: STATUS_COLOR[status],
                          fontSize: 11,
                          fontWeight: 600,
                          animation: status === "running" ? "pulse-led 1.5s ease-in-out infinite" : undefined,
                        }}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      {status === "done" && intro ? `${intro.slice(0, 70)}${intro.length > 70 ? "..." : ""}` : "—"}
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: "4px 10px" }}
                        disabled={status === "running"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResearch(lead.id);
                        }}
                      >
                        {status === "running" ? "Running..." : status === "done" ? "Re-run" : "Research"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {drawerLeadId && (
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
        >
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className="icon-btn" aria-label="Close research panel" onClick={() => setDrawerLeadId(null)}>
              <X size={16} />
            </button>
          </div>
          {(() => {
            const drawerLead = leads.find((l) => l.id === drawerLeadId);
            if (!drawerLead) return null;
            return (
              <LeadIntelligencePanel
                leadId={drawerLead.id}
                leadName={drawerLead.business_name}
                ownerName={drawerLead.owner_name ?? undefined}
              />
            );
          })()}
        </div>
      )}
    </>
  );
}
