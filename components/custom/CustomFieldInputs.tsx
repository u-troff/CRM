"use client";

import {
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldValues,
} from "@/types/custom";
import { coerceValue, isChecked, toInputValue } from "@/lib/custom/values";

interface CustomFieldInputsProps {
  definitions: CustomFieldDefinition[];
  values: CustomFieldValues;
  onChange: (fieldKey: string, value: CustomFieldValue) => void;
  columns?: number;
}

// Renders whatever fields a board has been given, in display order. Every form
// that edits a board's rows drops this in — the definitions decide what appears.
export default function CustomFieldInputs({
  definitions,
  values,
  onChange,
  columns = 2,
}: CustomFieldInputsProps) {
  if (definitions.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
      }}
    >
      {definitions.map((definition) => {
        const value = values[definition.fieldKey] ?? null;
        const set = (raw: string | boolean) =>
          onChange(definition.fieldKey, coerceValue(definition.fieldType, raw));

        return (
          <div className="form-group" key={definition.id}>
            <label className="form-label" htmlFor={`custom-${definition.id}`}>
              {definition.label}
            </label>

            {definition.fieldType === "boolean" ? (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                  padding: "7px 10px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  id={`custom-${definition.id}`}
                  type="checkbox"
                  checked={isChecked(value)}
                  onChange={(e) => set(e.target.checked)}
                  style={{ accentColor: "var(--accent-cyan)" }}
                />
                {isChecked(value) ? "Yes" : "No"}
              </label>
            ) : definition.fieldType === "select" ? (
              <select
                id={`custom-${definition.id}`}
                className="form-select"
                value={toInputValue(value)}
                onChange={(e) => set(e.target.value)}
              >
                <option value="">—</option>
                {definition.selectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`custom-${definition.id}`}
                className="form-input"
                type={definition.fieldType === "date" ? "date" : "text"}
                inputMode={definition.fieldType === "number" ? "decimal" : undefined}
                value={toInputValue(value)}
                onChange={(e) => set(e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
