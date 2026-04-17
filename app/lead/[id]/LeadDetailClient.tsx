"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lead, CallStatus, LeadTier } from "@/types/lead";
import { storage } from "@/lib/storage";
import TopBar from "@/components/layout/TopBar";
import TierBadge from "@/components/leads/TierBadge";
import StatusPill from "@/components/leads/StatusPill";
import { ALL_STATUSES, STATUS_META } from "@/lib/constants/statuses";
import { ALL_TIERS, TIER_META } from "@/lib/constants/tiers";
import { addManualAttempt } from "@/lib/leads/mutations";
import { Plus, AlertCircle, Trash2, ArrowLeft, ExternalLink } from "lucide-react";

interface LeadDetailClientProps {
  lead: Lead;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function LeadDetailClient({ lead: initialLead }: LeadDetailClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<Lead>(initialLead);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddAttempt, setShowAddAttempt] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState<CallStatus>("no_answer");
  const [attemptNotes, setAttemptNotes] = useState("");
  const [attemptDate, setAttemptDate] = useState(new Date().toISOString().slice(0, 16));

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await storage.saveLead({ ...form, updatedAt: Date.now() });
      router.push("/pipeline");
    } finally { setSaving(false); }
  }, [form, router]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    try {
      await storage.deleteLead(form.id);
      router.push("/pipeline");
    } finally { setSaving(false); }
  }, [form.id, router]);

  const handleAddAttempt = useCallback(async () => {
    const ts = new Date(attemptDate).getTime();
    const updated = await addManualAttempt(form, attemptStatus, attemptNotes, ts);
    setForm(updated);
    setShowAddAttempt(false);
    setAttemptNotes("");
  }, [form, attemptStatus, attemptNotes, attemptDate]);

  const sortedHistory = [...form.history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <>
      <TopBar title={form.businessName}>
        <button className="btn-secondary" onClick={() => router.push("/pipeline")} style={{ fontSize: 11 }}>
          <ArrowLeft size={13} /> Back to Pipeline
        </button>
      </TopBar>
      <div className="page-content" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <TierBadge tier={form.tier} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
            {form.businessName}
          </span>
          <StatusPill status={form.currentStatus} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { label: "Business Name", key: "businessName" as const },
            { label: "City", key: "city" as const },
            { label: "Owner Name", key: "ownerName" as const },
            { label: "Phone (raw)", key: "phoneRaw" as const },
          ].map(({ label, key }) => (
            <div key={key} className="form-group">
              <label className="form-label">{label}</label>
              <input className="form-input" value={form[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Website</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="form-input" value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
              {form.website && (
                <a href={form.website} target="_blank" rel="noopener noreferrer" aria-label="Open website">
                  <ExternalLink size={14} color="var(--accent-cyan)" style={{ marginTop: 10 }} />
                </a>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Rating</label>
            <input className="form-input" type="number" step="0.1" min="0" max="5"
              value={form.rating ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value ? parseFloat(e.target.value) : null }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Review Count</label>
            <input className="form-input" type="number" min="0"
              value={form.reviewCount ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reviewCount: e.target.value ? parseInt(e.target.value) : null }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tier</label>
            <select className="form-select" value={form.tier}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as LeadTier }))}>
              {ALL_TIERS.map((t) => (
                <option key={t} value={t} style={{ color: TIER_META[t].color }}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.currentStatus}
              onChange={(e) => setForm((f) => ({ ...f, currentStatus: e.target.value as CallStatus }))}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Franchise</label>
            <select className="form-select" value={form.isFranchise ? "yes" : "no"}
              onChange={(e) => setForm((f) => ({ ...f, isFranchise: e.target.value === "yes" }))}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Website Notes / Audit</label>
          <textarea className="form-input" rows={5} value={form.websiteNotes}
            onChange={(e) => setForm((f) => ({ ...f, websiteNotes: e.target.value }))} />
        </div>

        {/* Call History */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
              Call History ({sortedHistory.length})
            </span>
            <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 10 }}
              onClick={() => setShowAddAttempt((v) => !v)}>
              <Plus size={12} /> Add Attempt
            </button>
          </div>

          {showAddAttempt && (
            <div style={{ padding: 14, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={attemptStatus}
                    onChange={(e) => setAttemptStatus(e.target.value as CallStatus)}>
                    {ALL_STATUSES.filter((s) => s !== "new").map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date / Time</label>
                  <input className="form-input" type="datetime-local" value={attemptDate}
                    onChange={(e) => setAttemptDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={attemptNotes}
                  onChange={(e) => setAttemptNotes(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={handleAddAttempt}>Log Attempt</button>
                <button className="btn-secondary" onClick={() => setShowAddAttempt(false)}>Cancel</button>
              </div>
            </div>
          )}

          {sortedHistory.length === 0 ? (
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>No call attempts logged yet.</div>
          ) : sortedHistory.map((attempt) => {
            const meta = STATUS_META[attempt.status];
            return (
              <div key={attempt.id} className="call-attempt">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: meta.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{meta.label}</span>
                  <span style={{ color: "var(--text-faint)", fontSize: 10 }}>{formatTs(attempt.timestamp)}</span>
                </div>
                {attempt.notes && (
                  <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5, paddingLeft: 4 }}>{attempt.notes}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
          <div>
            {confirmDelete ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={14} color="var(--accent-red)" />
                <span style={{ color: "var(--accent-red)", fontSize: 12 }}>Confirm delete?</span>
                <button className="btn-danger" onClick={handleDelete} disabled={saving}>Delete</button>
                <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-danger" onClick={() => setConfirmDelete(true)} disabled={saving}>
                <Trash2 size={13} /> Delete Lead
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={() => router.push("/pipeline")}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
