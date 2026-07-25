"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Play, StepForward, Square } from "lucide-react";
import { InboundLead, NurtureSequence, NurtureStep } from "@/types/inbound";
import { stepsForSequence, nextDueStep } from "@/lib/inbound/queries";
import { startSequence, advanceStep, stopSequence } from "@/lib/inbound/mutations";
import { isFollowupDue, formatFollowupDate } from "@/lib/inbound/date";
import { CHANNEL_LABELS } from "@/lib/constants/inbound";
import { getErrorMessage } from "@/lib/errors";
import MessageComposer from "./MessageComposer";

interface NurtureTabProps {
  lead: InboundLead;
  sequences: NurtureSequence[];
  steps: NurtureStep[];
  onLeadUpdated: (updated: InboundLead) => void;
  onActivityChanged: () => void;
}

export default function NurtureTab({
  lead,
  sequences,
  steps,
  onLeadUpdated,
  onActivityChanged,
}: NurtureTabProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickSeq, setPickSeq] = useState<string>(sequences[0]?.id ?? "");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const seqSteps = useMemo(
    () => stepsForSequence(steps, lead.sequenceId),
    [steps, lead.sequenceId]
  );
  const currentSequence = sequences.find((s) => s.id === lead.sequenceId) ?? null;
  const dueStep = useMemo(() => nextDueStep(lead, steps), [lead, steps]);
  const followupDue = isFollowupDue(lead.nextFollowupAt);

  // Default the composer to the currently-due step whenever the lead changes.
  useEffect(() => {
    setSelectedStepId(dueStep?.id ?? null);
  }, [dueStep?.id, lead.id]);

  const selectedStep =
    seqSteps.find((s) => s.id === selectedStepId) ?? dueStep ?? null;

  const run = useCallback(
    async (fn: () => Promise<InboundLead>) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const updated = await fn();
        onLeadUpdated(updated);
        onActivityChanged();
      } catch (e) {
        setError(getErrorMessage(e, "Something went wrong."));
      } finally {
        setBusy(false);
      }
    },
    [busy, onLeadUpdated, onActivityChanged]
  );

  // ── Not on a sequence ──────────────────────────────────────────────────────
  if (!currentSequence) {
    return (
      <div>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 14 }}>
          This lead isn&apos;t on a nurture sequence yet.
        </p>
        {sequences.length === 0 ? (
          <div className="info-banner">
            No sequences yet. Create one in Settings → Sequences first.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">Sequence</label>
              <select
                className="form-select"
                value={pickSeq}
                onChange={(e) => setPickSeq(e.target.value)}
              >
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-primary"
              disabled={busy || !pickSeq}
              onClick={() => run(() => startSequence(lead, pickSeq, steps))}
            >
              <Play size={13} />
              Start sequence
            </button>
          </div>
        )}
        {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
      </div>
    );
  }

  // ── On a sequence ──────────────────────────────────────────────────────────
  const totalSteps = seqSteps.length;
  const completed = Math.min(lead.sequenceStep, totalSteps);
  const finished = !dueStep;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          border: "1px solid var(--border-default)",
          background: "var(--bg-elevated)",
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>
              {currentSequence.name}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
              {completed} of {totalSteps} steps done
              {lead.nextFollowupAt && (
                <>
                  {" · "}
                  <span style={{ color: followupDue ? "var(--accent-cyan)" : "var(--text-muted)" }}>
                    next {formatFollowupDate(lead.nextFollowupAt)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            className="btn-secondary"
            disabled={busy || finished}
            onClick={() => run(() => advanceStep(lead, steps))}
          >
            <StepForward size={13} />
            Advance step
          </button>
          <button
            className="btn-danger"
            disabled={busy}
            onClick={() => run(() => stopSequence(lead))}
          >
            <Square size={13} />
            Stop sequence
          </button>
        </div>
      </div>

      {selectedStep ? (
        <MessageComposer
          key={selectedStep.id}
          lead={lead}
          step={selectedStep}
          steps={steps}
          isDue={followupDue && selectedStep.id === dueStep?.id}
          onSent={(updated) => {
            onLeadUpdated(updated);
            onActivityChanged();
          }}
        />
      ) : (
        <div className="info-banner">Sequence complete — no more steps to send.</div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* Upcoming / all steps */}
      <div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Steps
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {seqSteps.map((s, idx) => {
            const isDone = idx < lead.sequenceStep;
            const isNext = s.id === dueStep?.id;
            const isSelected = s.id === selectedStep?.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStepId(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  background: isSelected ? "var(--bg-elevated)" : "transparent",
                  border: `1px solid ${isNext ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                  color: isDone ? "var(--text-faint)" : "var(--text-secondary)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>
                    #{s.stepNumber}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    {s.body}
                  </span>
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
                  Day {s.dayOffset} · {CHANNEL_LABELS[s.channel]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
