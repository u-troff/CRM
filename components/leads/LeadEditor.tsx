"use client";

import { useState, useCallback } from "react";
import { X, Plus, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { Lead, CallStatus, LeadTier, CallAttempt } from "@/types/lead";
import { ALL_STATUSES, STATUS_META } from "@/lib/constants/statuses";
import { ALL_TIERS, TIER_META } from "@/lib/constants/tiers";
import { addManualAttempt } from "@/lib/leads/mutations";
import StatusPill from "./StatusPill";
import TierBadge from "./TierBadge";

interface LeadEditorProps {
  lead: Lead;
  onSave: (updated: Lead) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeadEditor({ lead, onSave, onDelete, onClose }: LeadEditorProps) {
  const [form, setForm] = useState<Lead>({ ...lead });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddAttempt, setShowAddAttempt] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState<CallStatus>("no_answer");
  const [attemptNotes, setAttemptNotes] = useState("");
  const [attemptDate, setAttemptDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [saving2, setSaving2] = useState(false);

  const field = <K extends keyof Lead>(key: K) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [form, onSave, onClose]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [onDelete, onClose]);

  const handleAddAttempt = useCallback(async () => {
    setSaving2(true);
    try {
      const ts = new Date(attemptDate).getTime();
      const updated = await addManualAttempt(form, attemptStatus, attemptNotes, ts);
      setForm(updated);
      setShowAddAttempt(false);
      setAttemptNotes("");
    } finally {
      setSaving2(false);
    }
  }, [form, attemptStatus, attemptNotes, attemptDate]);

  const sortedHistory = [...form.history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, width: "100%" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TierBadge tier={form.tier} />
            <span
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {form.businessName}
            </span>
            <StatusPill status={form.currentStatus} />
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close editor">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", maxHeight: "calc(90vh - 48px)" }}>
          {/* Two-column grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input className="form-input" {...field("businessName")} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" {...field("city")} />
            </div>
            <div className="form-group">
              <label className="form-label">Owner Name</label>
              <input className="form-input" {...field("ownerName")} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (raw)</label>
              <input className="form-input" {...field("phoneRaw")} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input className="form-input" {...field("website")} />
                {form.website && (
                  <a
                    href={form.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open website"
                  >
                    <ExternalLink size={14} color="var(--accent-cyan)" />
                  </a>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rating: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Review Count</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.reviewCount ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    reviewCount: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tier</label>
              <select
                className="form-select"
                value={form.tier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tier: e.target.value as LeadTier }))
                }
              >
                {ALL_TIERS.map((t) => (
                  <option key={t} value={t} style={{ color: TIER_META[t].color }}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.currentStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currentStatus: e.target.value as CallStatus }))
                }
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Franchise</label>
              <select
                className="form-select"
                value={form.isFranchise ? "yes" : "no"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isFranchise: e.target.value === "yes" }))
                }
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Website Notes / Audit</label>
            <textarea className="form-input" rows={4} {...field("websiteNotes")} />
          </div>

          {/* Call History */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                Call History ({sortedHistory.length})
              </span>
              <button
                className="btn-secondary"
                style={{ padding: "4px 10px", fontSize: 10 }}
                onClick={() => setShowAddAttempt((v) => !v)}
              >
                <Plus size={12} />
                Add Attempt
              </button>
            </div>

            {/* Add manual attempt form */}
            {showAddAttempt && (
              <div
                style={{
                  padding: 14,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-elevated)",
                  marginBottom: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={attemptStatus}
                      onChange={(e) => setAttemptStatus(e.target.value as CallStatus)}
                    >
                      {ALL_STATUSES.filter((s) => s !== "new").map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date / Time</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={attemptDate}
                      onChange={(e) => setAttemptDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={attemptNotes}
                    onChange={(e) => setAttemptNotes(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={handleAddAttempt}
                    disabled={saving2}
                  >
                    Log Attempt
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowAddAttempt(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sortedHistory.length === 0 ? (
              <div style={{ color: "var(--text-faint)", fontSize: 12, padding: "10px 0" }}>
                No call attempts logged yet.
              </div>
            ) : (
              sortedHistory.map((attempt) => {
                const meta = STATUS_META[attempt.status];
                return (
                  <div key={attempt.id} className="call-attempt">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          color: meta.color,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {meta.label}
                      </span>
                      <span style={{ color: "var(--text-faint)", fontSize: 10 }}>
                        {formatTs(attempt.timestamp)}
                      </span>
                      {attempt.durationSeconds && (
                        <span style={{ color: "var(--text-faint)", fontSize: 10 }}>
                          · {Math.floor(attempt.durationSeconds / 60)}m{" "}
                          {attempt.durationSeconds % 60}s
                        </span>
                      )}
                    </div>
                    {attempt.notes && (
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: 12,
                          lineHeight: 1.5,
                          paddingLeft: 4,
                        }}
                      >
                        {attempt.notes}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              {confirmDelete ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} color="var(--accent-red)" />
                  <span style={{ color: "var(--accent-red)", fontSize: 12 }}>
                    Confirm delete?
                  </span>
                  <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                    Delete
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn-danger"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                >
                  <Trash2 size={13} />
                  Delete Lead
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
