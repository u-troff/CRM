"use client";

import { useState, useCallback } from "react";
import { X, Sparkles, Wand2 } from "lucide-react";
import { NurtureChannel, SequenceBrief, SequenceDraft } from "@/types/inbound";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/constants/inbound";
import { generateSequenceDraft, createSequenceFromDraft } from "@/lib/inbound/ai";
import { getErrorMessage } from "@/lib/errors";

interface GenerateSequenceModalProps {
  onClose: () => void;
  onCreated: (sequenceId: string) => void;
}

const DEFAULT_BRIEF: SequenceBrief = {
  goal: "",
  audience: "",
  tone: "Friendly, plain-spoken, human",
  channel: "whatsapp",
  stepCount: 5,
};

export default function GenerateSequenceModal({ onClose, onCreated }: GenerateSequenceModalProps) {
  const [brief, setBrief] = useState<SequenceBrief>(DEFAULT_BRIEF);
  const [draft, setDraft] = useState<SequenceDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SequenceBrief>(key: K, val: SequenceBrief[K]) =>
    setBrief((b) => ({ ...b, [key]: val }));

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateSequenceDraft(brief);
      setDraft(result);
    } catch (e) {
      setError(getErrorMessage(e, "Could not generate a sequence."));
    } finally {
      setGenerating(false);
    }
  }, [brief, generating]);

  const handleUse = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createSequenceFromDraft(draft);
      onCreated(id);
    } catch (e) {
      setError(getErrorMessage(e, "Could not save the sequence."));
      setSaving(false);
    }
  }, [draft, saving, onCreated]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 620, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600 }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            Generate sequence with AI
          </span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {!draft ? (
            // ── Brief form ──────────────────────────────────────────────────
            <>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Goal of the sequence</label>
                <input
                  className="form-input"
                  placeholder="e.g. book a 15-min call about a new website"
                  value={brief.goal}
                  onChange={(e) => set("goal", e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Who are the leads?</label>
                <input
                  className="form-input"
                  placeholder="e.g. contractors who enquired from a Facebook ad"
                  value={brief.audience}
                  onChange={(e) => set("audience", e.target.value)}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Tone</label>
                  <input
                    className="form-input"
                    value={brief.tone}
                    onChange={(e) => set("tone", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Channel</label>
                  <select
                    className="form-select"
                    value={brief.channel}
                    onChange={(e) => set("channel", e.target.value as NurtureChannel)}
                  >
                    {CHANNELS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Steps</label>
                  <input
                    className="form-input"
                    type="number"
                    min={2}
                    max={8}
                    value={brief.stepCount}
                    onChange={(e) => set("stepCount", Number(e.target.value))}
                  />
                </div>
              </div>

              {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn-secondary" onClick={onClose} disabled={generating}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
                  <Wand2 size={13} />
                  {generating ? "Generating…" : "Generate"}
                </button>
              </div>
            </>
          ) : (
            // ── Draft preview ───────────────────────────────────────────────
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  {draft.name}
                </div>
                {draft.description && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {draft.description}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {draft.steps.map((s) => (
                  <div
                    key={s.step_number}
                    style={{ border: "1px solid var(--border-subtle)", padding: 10, background: "var(--bg-elevated)" }}
                  >
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>
                      Step {s.step_number} · Day {s.day_offset} · {CHANNEL_LABELS[s.channel]}
                    </div>
                    {s.subject && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 2 }}>
                        {s.subject}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {s.body}
                    </div>
                  </div>
                ))}
              </div>

              <div className="info-banner" style={{ marginBottom: 14 }}>
                Save it, then fine-tune any step in the editor.
              </div>

              {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <button className="btn-secondary" onClick={() => setDraft(null)} disabled={saving}>
                  Edit brief
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" onClick={handleGenerate} disabled={generating || saving}>
                    <Wand2 size={13} />
                    {generating ? "…" : "Regenerate"}
                  </button>
                  <button className="btn-primary" onClick={handleUse} disabled={saving}>
                    {saving ? "Saving…" : "Use this sequence"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
