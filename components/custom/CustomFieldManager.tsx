"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  BoardKey,
  CustomFieldDefinition,
  CustomFieldDefinitionInput,
  CustomFieldType,
} from "@/types/custom";
import { useCustomFields } from "@/hooks/useCustomFields";
import {
  createCustomField,
  deleteCustomField,
  reorderCustomFields,
  updateCustomField,
} from "@/lib/custom/mutations";
import { isValidFieldKey, slugifyFieldKey } from "@/lib/custom/values";
import { getErrorMessage } from "@/lib/errors";

interface CustomFieldManagerProps {
  boardKey: BoardKey;
}

const FIELD_TYPES: { id: CustomFieldType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "number", label: "Number" },
  { id: "date", label: "Date" },
  { id: "select", label: "Select" },
  { id: "boolean", label: "Yes / No" },
];

interface FormState {
  label: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  options: string; // comma-separated while editing
  // Once the key has been typed by hand it stops tracking the label, so
  // renaming a field doesn't silently orphan its saved values.
  keyEdited: boolean;
}

const EMPTY: FormState = {
  label: "",
  fieldKey: "",
  fieldType: "text",
  options: "",
  keyEdited: false,
};

function toFormState(definition: CustomFieldDefinition): FormState {
  return {
    label: definition.label,
    fieldKey: definition.fieldKey,
    fieldType: definition.fieldType,
    options: definition.selectOptions.join(", "),
    keyEdited: true,
  };
}

function parseOptions(raw: string): string[] {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export default function CustomFieldManager({ boardKey }: CustomFieldManagerProps) {
  const { definitions, loading, error: loadError, reload } = useCustomFields(boardKey);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const editing = definitions.find((d) => d.id === editingId) ?? null;
  const keyChanged = Boolean(editing && editing.fieldKey !== form.fieldKey);

  const takenKeys = useMemo(
    () =>
      new Set(
        definitions.filter((d) => d.id !== editingId).map((d) => d.fieldKey)
      ),
    [definitions, editingId]
  );

  const options = parseOptions(form.options);
  const keyValid = isValidFieldKey(form.fieldKey) && !takenKeys.has(form.fieldKey);
  const canSave =
    Boolean(form.label.trim()) &&
    keyValid &&
    (form.fieldType !== "select" || options.length > 0);

  const resetForm = useCallback(() => {
    setForm(EMPTY);
    setEditingId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    const input: CustomFieldDefinitionInput = {
      boardKey,
      fieldKey: form.fieldKey,
      label: form.label,
      fieldType: form.fieldType,
      selectOptions: options,
      displayOrder: editing ? editing.displayOrder : definitions.length,
    };
    try {
      if (editingId) await updateCustomField(editingId, input);
      else await createCustomField(input);
      resetForm();
      reload();
    } catch (e) {
      setError(getErrorMessage(e, "Could not save the field."));
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    saving,
    boardKey,
    form,
    options,
    editing,
    editingId,
    definitions.length,
    resetForm,
    reload,
  ]);

  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
      try {
        await deleteCustomField(id);
        reload();
      } catch (e) {
        setError(getErrorMessage(e, "Could not delete the field."));
      }
    },
    [editingId, resetForm, reload]
  );

  // Swap a field with its neighbour and write both orders back.
  const handleMove = useCallback(
    async (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= definitions.length) return;
      const reordered = [...definitions];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      try {
        await reorderCustomFields(
          reordered.map((d, i) => ({ id: d.id, displayOrder: i }))
        );
        reload();
      } catch (e) {
        setError(getErrorMessage(e, "Could not reorder fields."));
      }
    },
    [definitions, reload]
  );

  return (
    <div>
      {/* Add / edit form */}
      <div
        style={{
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Label *</label>
            <input
              className="form-input"
              placeholder="Referred by"
              value={form.label}
              onChange={(e) => {
                const label = e.target.value;
                setForm((f) => ({
                  ...f,
                  label,
                  fieldKey: f.keyEdited ? f.fieldKey : slugifyFieldKey(label),
                }));
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Field Key *</label>
            <input
              className="form-input"
              style={{ fontFamily: "var(--font-mono)" }}
              placeholder="referred_by"
              value={form.fieldKey}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  fieldKey: e.target.value,
                  keyEdited: true,
                }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={form.fieldType}
              onChange={(e) => set("fieldType", e.target.value as CustomFieldType)}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.fieldType === "select" && (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Options (comma separated) *</label>
            <input
              className="form-input"
              placeholder="Hot, Warm, Cold"
              value={form.options}
              onChange={(e) => set("options", e.target.value)}
            />
          </div>
        )}

        {form.fieldKey && !isValidFieldKey(form.fieldKey) && (
          <div style={{ fontSize: 11, color: "var(--accent-amber)", marginTop: 10 }}>
            Field key must start with a letter and use only lowercase letters,
            numbers and underscores.
          </div>
        )}
        {takenKeys.has(form.fieldKey) && (
          <div style={{ fontSize: 11, color: "var(--accent-amber)", marginTop: 10 }}>
            Another field on this board already uses that key.
          </div>
        )}
        {keyChanged && (
          <div style={{ fontSize: 11, color: "var(--accent-amber)", marginTop: 10 }}>
            Changing the key leaves values already saved under{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>{editing?.fieldKey}</code>{" "}
            behind — this field will read as empty on existing leads.
          </div>
        )}

        {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !canSave}>
            {!editingId && <Plus size={13} />}
            {saving ? "Saving…" : editingId ? "Save Changes" : "Add Field"}
          </button>
          {editingId && (
            <button className="btn-secondary" onClick={resetForm} disabled={saving}>
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {loadError && <div className="error-banner" style={{ marginBottom: 12 }}>{loadError}</div>}

      {/* Existing fields */}
      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>
      ) : definitions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No custom fields</div>
          <div className="empty-state-subtitle">
            Add one above and it appears on every lead straight away.
          </div>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border-subtle)" }}>
          <table className="data-table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 60 }}>Order</th>
                <th style={{ width: 200 }}>Label</th>
                <th style={{ width: 180 }}>Key</th>
                <th style={{ width: 100 }}>Type</th>
                <th>Options</th>
                <th style={{ width: 80, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((definition, index) => (
                <tr key={definition.id}>
                  <td>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button
                        className="icon-btn"
                        aria-label={`Move ${definition.label} up`}
                        disabled={index === 0}
                        onClick={() => handleMove(index, -1)}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Move ${definition.label} down`}
                        disabled={index === definitions.length - 1}
                        onClick={() => handleMove(index, 1)}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
                    {definition.label}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {definition.fieldKey}
                  </td>
                  <td>
                    {FIELD_TYPES.find((t) => t.id === definition.fieldType)?.label ??
                      definition.fieldType}
                  </td>
                  <td
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {definition.selectOptions.length
                      ? definition.selectOptions.join(", ")
                      : "—"}
                  </td>
                  <td style={{ textAlign: "center", overflow: "visible" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <button
                        className="icon-btn"
                        aria-label={`Edit ${definition.label}`}
                        onClick={() => {
                          setEditingId(definition.id);
                          setForm(toFormState(definition));
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      {confirmDeleteId === definition.id ? (
                        <button
                          className="btn-danger"
                          style={{ padding: "2px 6px", fontSize: 10 }}
                          onClick={() => handleDelete(definition.id)}
                          onBlur={() => setConfirmDeleteId(null)}
                          autoFocus
                        >
                          Sure?
                        </button>
                      ) : (
                        <button
                          className="icon-btn"
                          aria-label={`Delete ${definition.label}`}
                          title="Removes the field from forms. Values already saved are kept."
                          onClick={() => setConfirmDeleteId(definition.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
