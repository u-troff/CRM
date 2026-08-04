"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Check, Undo2 } from "lucide-react";
import { Currency } from "@/types/ads";
import { ClientRevenueEntry, ClientRevenueEntryInput, RevenueEntryType } from "@/types/revenue";
import { CURRENCIES } from "@/lib/constants/ads";
import { REVENUE_TYPES, REVENUE_TYPE_MAP } from "@/lib/constants/revenue";
import {
  currentMonthInputs,
  formatMoney,
  formatPeriod,
  formatPeriodDate,
  parseMoneyInput,
  todayInput,
} from "@/lib/ads/format";
import { totalsForEntries } from "@/lib/revenue/queries";
import {
  createRevenueEntry,
  deleteRevenueEntry,
  setRevenueCollected,
  updateRevenueEntry,
} from "@/lib/revenue/mutations";
import { useClientRevenue } from "@/hooks/useClientRevenue";
import { useInvalidateCampaignReport } from "@/hooks/useCampaignReport";
import { getErrorMessage } from "@/lib/errors";

interface RevenueEntriesPanelProps {
  leadId: string;
  entries: ClientRevenueEntry[]; // already filtered to this lead
  defaultCurrency: Currency;
  // Shown the first time a client is logged, when there is nothing to list yet.
  firstEntryHint?: boolean;
  onSaved?: () => void;
}

// Amount is held as text while editing so the field can be cleared mid-typing
// without snapping back to 0.
interface FormState {
  entryType: RevenueEntryType;
  description: string;
  amount: string;
  currency: Currency;
  periodStart: string;
  periodEnd: string;
  expectedDate: string;
  collectedDate: string;
}

function emptyForm(currency: Currency): FormState {
  const month = currentMonthInputs();
  return {
    entryType: "setup_fee",
    description: "",
    amount: "",
    currency,
    periodStart: month.start,
    periodEnd: month.end,
    expectedDate: todayInput(),
    collectedDate: "",
  };
}

function toFormState(entry: ClientRevenueEntry): FormState {
  const month = currentMonthInputs();
  return {
    entryType: entry.entryType,
    description: entry.description ?? "",
    amount: String(entry.amount),
    currency: entry.currency,
    periodStart: entry.periodStart ?? month.start,
    periodEnd: entry.periodEnd ?? month.end,
    expectedDate: entry.expectedDate,
    collectedDate: entry.collectedDate ?? "",
  };
}

export default function RevenueEntriesPanel({
  leadId,
  entries,
  defaultCurrency,
  firstEntryHint = false,
  onSaved,
}: RevenueEntriesPanelProps) {
  const { patchEntry, removeEntry, restore, reload } = useClientRevenue();
  const invalidateReport = useInvalidateCampaignReport();

  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCurrency));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.expectedDate.localeCompare(a.expectedDate)),
    [entries]
  );
  const totals = useMemo(() => totalsForEntries(entries), [entries]);
  const mixedCurrency = totals.currencies.length > 1;

  // Only a retainer or a commission covers a period; a setup fee isn't "for"
  // a month, so the period columns stay null on one-offs.
  const periodic = REVENUE_TYPE_MAP[form.entryType].periodic;

  const resetForm = useCallback(
    () => {
      setForm(emptyForm(defaultCurrency));
      setEditingId(null);
    },
    [defaultCurrency]
  );

  const afterWrite = useCallback(() => {
    reload();
    invalidateReport();
    onSaved?.();
  }, [reload, invalidateReport, onSaved]);

  const handleSave = useCallback(async () => {
    if (!form.expectedDate || saving) return;
    setSaving(true);
    setError(null);
    const input: ClientRevenueEntryInput = {
      entryType: form.entryType,
      description: form.description,
      amount: parseMoneyInput(form.amount),
      currency: form.currency,
      periodStart: periodic ? form.periodStart : null,
      periodEnd: periodic ? form.periodEnd : null,
      expectedDate: form.expectedDate,
      collectedDate: form.collectedDate || null,
    };
    try {
      const saved = editingId
        ? await updateRevenueEntry(editingId, input)
        : await createRevenueEntry(leadId, input);
      patchEntry(saved);
      resetForm();
      afterWrite();
    } catch (e) {
      setError(getErrorMessage(e, "Could not save the revenue entry."));
    } finally {
      setSaving(false);
    }
  }, [form, periodic, saving, editingId, leadId, patchEntry, resetForm, afterWrite]);

  const handleToggleCollected = useCallback(
    async (entry: ClientRevenueEntry) => {
      const next = entry.collectedDate ? null : todayInput();
      const snapshot = patchEntry({ ...entry, collectedDate: next });
      try {
        const saved = await setRevenueCollected(entry.id, next);
        patchEntry(saved);
        afterWrite();
      } catch (e) {
        restore(snapshot);
        setError(getErrorMessage(e, "Could not update the entry."));
      }
    },
    [patchEntry, restore, afterWrite]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
      const snapshot = removeEntry(id);
      try {
        await deleteRevenueEntry(id);
        afterWrite();
      } catch (e) {
        restore(snapshot);
        setError(getErrorMessage(e, "Could not delete the entry."));
      }
    },
    [editingId, resetForm, removeEntry, restore, afterWrite]
  );

  return (
    <div>
      {firstEntryHint && entries.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
          Log the first payment now — setup fee, first retainer, or whatever
          applies. Add a row each month (or each commission) from the lead's
          Revenue tab after that.
        </p>
      )}

      {/* Add / edit form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={form.entryType}
            onChange={(e) => set("entryType", e.target.value as RevenueEntryType)}
            style={{ color: REVENUE_TYPE_MAP[form.entryType].color }}
          >
            {REVENUE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Amount</label>
          <input
            className="form-input"
            inputMode="decimal"
            placeholder="0"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <div className="form-group">
          <label className="form-label">Expected *</label>
          <input
            className="form-input"
            type="date"
            value={form.expectedDate}
            onChange={(e) => set("expectedDate", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Collected</label>
          <input
            className="form-input"
            type="date"
            value={form.collectedDate}
            onChange={(e) => set("collectedDate", e.target.value)}
          />
        </div>
      </div>

      {periodic && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
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
        </div>
      )}

      <div className="form-group" style={{ marginTop: 10 }}>
        <label className="form-label">Description</label>
        <input
          className="form-input"
          placeholder="August retainer, July commission…"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 14, marginBottom: 18 }}>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !form.expectedDate}
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

      {/* Existing entries */}
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No revenue logged</div>
          <div className="empty-state-subtitle">
            Nothing has been billed to this client yet.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 20, marginBottom: 10, fontSize: 11 }}>
            <span style={{ color: "var(--text-muted)" }}>
              Collected{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-lime)" }}>
                {formatMoney(totals.collected, totals.currencies[0] ?? defaultCurrency)}
              </span>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Outstanding{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: totals.outstanding > 0 ? "var(--accent-amber)" : "var(--text-secondary)",
                }}
              >
                {formatMoney(totals.outstanding, totals.currencies[0] ?? defaultCurrency)}
              </span>
            </span>
            {mixedCurrency && (
              <span style={{ color: "var(--accent-amber)" }}>
                Mixed currencies — totals above are not meaningful.
              </span>
            )}
          </div>

          <div style={{ border: "1px solid var(--border-subtle)" }}>
            <table className="data-table" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Type</th>
                  <th>Description</th>
                  <th style={{ width: 100, textAlign: "right" }}>Amount</th>
                  <th style={{ width: 110 }}>Expected</th>
                  <th style={{ width: 110 }}>Collected</th>
                  <th style={{ width: 100, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => {
                  const type = REVENUE_TYPE_MAP[entry.entryType];
                  return (
                    <tr key={entry.id}>
                      <td style={{ color: type.color, fontSize: 11 }}>
                        {type.label}
                        {entry.periodStart && entry.periodEnd && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-faint)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {formatPeriod(entry.periodStart, entry.periodEnd)}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {entry.description ?? "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          textAlign: "right",
                          color: entry.collectedDate ? "var(--accent-lime)" : "var(--accent-amber)",
                        }}
                      >
                        {formatMoney(entry.amount, entry.currency)}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {formatPeriodDate(entry.expectedDate)}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {entry.collectedDate ? formatPeriodDate(entry.collectedDate) : "—"}
                      </td>
                      <td style={{ textAlign: "center", overflow: "visible" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <button
                            className="icon-btn"
                            aria-label={
                              entry.collectedDate
                                ? "Mark as still outstanding"
                                : "Mark as collected today"
                            }
                            title={
                              entry.collectedDate
                                ? "Mark as still outstanding"
                                : "Mark as collected today"
                            }
                            onClick={() => handleToggleCollected(entry)}
                          >
                            {entry.collectedDate ? <Undo2 size={13} /> : <Check size={13} />}
                          </button>
                          <button
                            className="icon-btn"
                            aria-label="Edit entry"
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
                              aria-label="Delete entry"
                              onClick={() => setConfirmDeleteId(entry.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
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
  );
}
