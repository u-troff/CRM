"use client";

import { useState, useCallback } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, Trash2, Check } from "lucide-react";
import { NurtureStep } from "@/types/inbound";
import { CHANNELS } from "@/lib/constants/inbound";
import { NurtureChannel } from "@/types/inbound";
import { updateStep, deleteStep, StepInput } from "@/lib/inbound/mutations";
import { getErrorMessage } from "@/lib/errors";

interface StepCardProps {
  step: NurtureStep;
  index: number;
  onChanged: () => void;
}

export default function StepCard({ step, index, onChanged }: StepCardProps) {
  const [draft, setDraft] = useState<StepInput>({
    stepNumber: step.stepNumber,
    dayOffset: step.dayOffset,
    channel: step.channel,
    subject: step.subject ?? "",
    body: step.body,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof StepInput>(key: K, val: StepInput[K]) =>
    setDraft((d) => ({ ...d, [key]: val }));

  const handleSave = useCallback(async () => {
    if (saving || !draft.body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateStep(step.id, draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onChanged();
    } catch (e) {
      setError(getErrorMessage(e, "Could not save step."));
    } finally {
      setSaving(false);
    }
  }, [saving, draft, step.id, onChanged]);

  const handleDelete = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteStep(step.id);
      onChanged();
    } catch (e) {
      setError(getErrorMessage(e, "Could not delete step."));
      setSaving(false);
    }
  }, [saving, step.id, onChanged]);

  return (
    <Draggable draggableId={step.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            border: `1px solid ${snapshot.isDragging ? "var(--accent-cyan)" : "var(--border-default)"}`,
            background: "var(--bg-panel)",
            padding: 12,
            marginBottom: 10,
            ...provided.draggableProps.style,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span {...provided.dragHandleProps} className="icon-btn" aria-label="Drag to reorder" style={{ cursor: "grab", padding: 0, width: 20 }}>
              <GripVertical size={14} />
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Step</label>
              <input
                className="form-input"
                type="number"
                value={draft.stepNumber}
                onChange={(e) => set("stepNumber", Number(e.target.value))}
                style={{ width: 60 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Day</label>
              <input
                className="form-input"
                type="number"
                value={draft.dayOffset}
                onChange={(e) => set("dayOffset", Number(e.target.value))}
                style={{ width: 60 }}
              />
            </div>
            <select
              className="form-select"
              value={draft.channel}
              onChange={(e) => set("channel", e.target.value as NurtureChannel)}
              style={{ width: 120 }}
            >
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <button className="icon-btn" aria-label="Delete step" onClick={handleDelete}>
              <Trash2 size={14} />
            </button>
          </div>

          <input
            className="form-input"
            placeholder="Subject (optional — used for email)"
            value={draft.subject}
            onChange={(e) => set("subject", e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <textarea
            className="form-input"
            rows={3}
            placeholder="Message body. Merge fields: {{first_name}} {{full_name}} {{business_name}} {{website}} {{city}}"
            value={draft.body}
            onChange={(e) => set("body", e.target.value)}
            style={{ marginBottom: 8 }}
          />

          {error && <div className="error-banner" style={{ marginBottom: 8 }}>{error}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn-secondary" onClick={handleSave} disabled={saving || !draft.body.trim()}>
              {saving ? "Saving…" : "Save step"}
            </button>
            {saved && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent-lime)", fontSize: 11 }}>
                <Check size={13} /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
