"use client";

import { useState, useCallback } from "react";
import {
  MessageSquare,
  StickyNote,
  ArrowRightLeft,
  Phone,
  Play,
  Square,
} from "lucide-react";
import { ActivityType, LeadActivity } from "@/types/inbound";
import { addNote } from "@/lib/inbound/mutations";
import { useLeadActivity } from "@/hooks/useNurture";
import { getErrorMessage } from "@/lib/errors";

const TYPE_META: Record<ActivityType, { icon: typeof MessageSquare; label: string; color: string }> = {
  message_sent: { icon: MessageSquare, label: "Message sent", color: "var(--accent-cyan)" },
  note: { icon: StickyNote, label: "Note", color: "var(--text-secondary)" },
  stage_change: { icon: ArrowRightLeft, label: "Stage change", color: "var(--accent-amber)" },
  call_logged: { icon: Phone, label: "Call logged", color: "var(--accent-emerald)" },
  sequence_started: { icon: Play, label: "Sequence started", color: "var(--accent-lime)" },
  sequence_stopped: { icon: Square, label: "Sequence stopped", color: "var(--accent-red)" },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ActivityRow({ item }: { item: LeadActivity }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  return (
    <div className="call-attempt" style={{ display: "flex", gap: 10 }}>
      <Icon size={14} style={{ color: meta.color, marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
            {meta.label}
            {item.channel ? ` · ${item.channel}` : ""}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-faint)", flexShrink: 0 }}>
            {formatWhen(item.createdAt)}
          </span>
        </div>
        {item.content && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 4,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
            }}
          >
            {item.content}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityTab({ leadId }: { leadId: string }) {
  const { activity, loading, error, reload } = useLeadActivity(leadId);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAddNote = useCallback(async () => {
    if (!note.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addNote(leadId, note);
      setNote("");
      reload();
    } catch (e) {
      setSaveError(getErrorMessage(e, "Could not save note."));
    } finally {
      setSaving(false);
    }
  }, [note, saving, leadId, reload]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <textarea
          className="form-input"
          rows={2}
          placeholder="Add a quick note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ resize: "none", marginBottom: 8 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn-primary" onClick={handleAddNote} disabled={saving || !note.trim()}>
            {saving ? "Adding…" : "Add note"}
          </button>
        </div>
        {saveError && <div className="error-banner" style={{ marginTop: 8 }}>{saveError}</div>}
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading activity…</div>
      ) : activity.length === 0 ? (
        <div style={{ color: "var(--text-faint)", fontSize: 12, padding: "20px 0", textAlign: "center" }}>
          No activity yet.
        </div>
      ) : (
        <div>
          {activity.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
