"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  AdCampaign,
  AdSpendEntry,
  AdSpendEntryInput,
  Currency,
} from "@/types/ads";
import { CURRENCIES } from "@/lib/constants/ads";
import {
  currentWeekInputs,
  formatMoney,
  formatPeriod,
  parseMoneyInput,
} from "@/lib/ads/format";
import { getErrorMessage } from "@/lib/errors";

interface SpendEntriesModalProps {
  campaign: AdCampaign;
  entries: AdSpendEntry[]; // already filtered to this campaign
  onClose: () => void;
  onCreate: (input: AdSpendEntryInput) => Promise<void>;
  onUpdate: (id: string, input: AdSpendEntryInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// Amount is held as text while editing so the field can be cleared mid-typing
// without snapping back to 0.
interface FormState {
  periodStart: string;
  periodEnd: string;
  amountSpent: string;
  currency: Currency;
  notes: string;
}

function emptyForm(campaign: AdCampaign): FormState {
  const week = currentWeekInputs();
  return {
    periodStart: week.start,
    periodEnd: week.end,
    amountSpent: "",
    currency: campaign.currency,
    notes: "",
  };
}

function toFormState(entry: AdSpendEntry): FormState {
  return {
    periodStart: entry.periodStart,
    periodEnd: entry.periodEnd,
    amountSpent: String(entry.amountSpent),
    currency: entry.currency,
    notes: entry.notes ?? "",
  };
}

export default function SpendEntriesModal({
  campaign,
  entries,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: SpendEntriesModalProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(campaign));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.periodStart.localeCompare(a.periodStart)),
    [entries]
  );

  const total = useMemo(
    () => entries.reduce((sum, e) => sum + e.amountSpent, 0),
    [entries]
  );

  const periodValid = Boolean(
    form.periodStart && form.periodEnd && form.periodEnd >= form.periodStart
  );

  const resetForm = useCallback(() => {
    setForm(emptyForm(campaign));
    setEditingId(null);
  }, [campaign]);

  const handleSave = useCallback(async () => {
    if (!periodValid || saving) return;
    setSaving(true);
    setError(null);
    const input: AdSpendEntryInput = {
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      amountSpent: parseMoneyInput(form.amountSpent),
      currency: form.currency,
      notes: form.notes,
    };
    try {
      if (editingId) await onUpdate(editingId, input);
      else await onCreate(input);
      resetForm();
    } catch (e) {
      setError(getErrorMessage(e, "Could not save spend entry."));
    } finally {
      setSaving(false);
    }
  }, [form, periodValid, saving, editingId, onCreate, onUpdate, resetForm]);

  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
      try {
        await onDelete(id);
      } catch (e) {
        setError(getErrorMessage(e, "Could not delete spend entry."));
      }
    },
    [onDelete, editingId, resetForm]
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 720, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            Ad Spend — {campaign.name}
          </span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, maxHeight: "70vh", overflowY: "auto" }}>
          {/* Add / edit form */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div className="form-group">
              <label className="form-label">Period Start</label>
              <input
                className="form-input"
                type="date"
                value={form.periodStart}
                onChange={(e) => set("periodStart", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Period End</label>
              <input
                className="form-input"
                type="date"
                value={form.periodEnd}
                onChange={(e) => set("periodEnd", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount Spent</label>
              <input
                className="form-input"
                inputMode="decimal"
                placeholder="0"
                value={form.amountSpent}
                onChange={(e) => set("amountSpent", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Notes</label>
            <input
              className="form-input"
              placeholder="Optional — creative swap, budget change…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {!periodValid && (
            <div style={{ fontSize: 11, color: "var(--accent-amber)", marginBottom: 10 }}>
              Period end must fall on or after period start.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !periodValid}
            >
              {!editingId && <Plus size={13} />}
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Entry"}
            </button>
            {editingId && (
              <button className="btn-secondary" onClick={resetForm} disabled={saving}>
                Cancel Edit
              </button>
            )}
          </div>

          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

          {/* Existing entries */}
          {sorted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No spend logged</div>
              <div className="empty-state-subtitle">
                Add one entry per week so cost per lead tracks how spend actually moved.
              </div>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--border-subtle)" }}>
              <table className="data-table" style={{ tableLayout: "fixed", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Period</th>
                    <th style={{ width: 110, textAlign: "right" }}>Spent</th>
                    <th>Notes</th>
                    <th style={{ width: 80, textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((entry) => (
                    <tr
                      key={entry.id}
                      style={
                        entry.id === editingId
                          ? { background: "var(--bg-elevated)" }
                          : undefined
                      }
                    >
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {formatPeriod(entry.periodStart, entry.periodEnd)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          textAlign: "right",
                          color:
                            entry.currency === campaign.currency
                              ? "var(--text-primary)"
                              : "var(--accent-amber)",
                        }}
                        title={
                          entry.currency === campaign.currency
                            ? undefined
                            : `Logged in ${entry.currency}, campaign bills in ${campaign.currency}`
                        }
                      >
                        {formatMoney(entry.amountSpent, entry.currency)}
                      </td>
                      <td
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {entry.notes ?? "—"}
                      </td>
                      <td style={{ textAlign: "center", overflow: "visible" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <button
                            className="icon-btn"
                            aria-label={`Edit entry ${formatPeriod(entry.periodStart, entry.periodEnd)}`}
                            onClick={() => {
                              setEditingId(entry.id);
                              setForm(toFormState(entry));
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          {confirmDeleteId === entry.id ? (
                            <button
                              className="btn-danger"
                              style={{ padding: "2px 6px", fontSize: 10 }}
                              onClick={() => handleDelete(entry.id)}
                              onBlur={() => setConfirmDeleteId(null)}
                              autoFocus
                            >
                              Sure?
                            </button>
                          ) : (
                            <button
                              className="icon-btn"
                              aria-label={`Delete entry ${formatPeriod(entry.periodStart, entry.periodEnd)}`}
                              onClick={() => setConfirmDeleteId(entry.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        textAlign: "right",
                        color: "var(--text-primary)",
                      }}
                    >
                      {formatMoney(total, campaign.currency)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
