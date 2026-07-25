"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { useNurture } from "@/hooks/useNurture";
import { stepsForSequence } from "@/lib/inbound/queries";
import {
  createSequence,
  updateSequence,
  deleteSequence,
  createStep,
  reorderSteps,
  seedStarterSequence,
} from "@/lib/inbound/mutations";
import { getErrorMessage } from "@/lib/errors";
import StepCard from "./StepCard";
import GenerateSequenceModal from "./GenerateSequenceModal";

export default function SequenceManager() {
  const { sequences, steps, loading, error, reload } = useNurture();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);

  // Keep a valid selection as sequences load / change.
  useEffect(() => {
    if (sequences.length === 0) {
      setSelectedId(null);
    } else if (!selectedId || !sequences.some((s) => s.id === selectedId)) {
      setSelectedId(sequences[0].id);
    }
  }, [sequences, selectedId]);

  const selected = sequences.find((s) => s.id === selectedId) ?? null;
  const seqSteps = useMemo(
    () => stepsForSequence(steps, selectedId),
    [steps, selectedId]
  );

  // Editable name/description for the selected sequence.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => {
    setName(selected?.name ?? "");
    setDescription(selected?.description ?? "");
  }, [selected?.id, selected?.name, selected?.description]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      if (busy) return;
      setBusy(true);
      setActionError(null);
      try {
        await fn();
        await reload();
      } catch (e) {
        setActionError(getErrorMessage(e, "Something went wrong."));
      } finally {
        setBusy(false);
      }
    },
    [busy, reload]
  );

  const handleNewSequence = () =>
    run(async () => {
      const id = await createSequence("New sequence", "");
      setSelectedId(id);
    });

  const handleSeed = () => run(() => seedStarterSequence());

  const handleSaveSequence = () => {
    if (!selected) return;
    run(() => updateSequence(selected.id, name, description));
  };

  const handleDeleteSequence = () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}" and all its steps?`)) return;
    run(() => deleteSequence(selected.id));
  };

  const handleAddStep = () => {
    if (!selected) return;
    const nextNumber = seqSteps.length ? Math.max(...seqSteps.map((s) => s.stepNumber)) + 1 : 1;
    const lastOffset = seqSteps.length ? Math.max(...seqSteps.map((s) => s.dayOffset)) : -1;
    run(() =>
      createStep(selected.id, {
        stepNumber: nextNumber,
        dayOffset: lastOffset + 1,
        channel: "whatsapp",
        subject: "",
        body: "New message. Hi {{first_name}}!",
      })
    );
  };

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source } = result;
      if (!destination || destination.index === source.index) return;
      const reordered = [...seqSteps];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      // Renumber sequentially and persist.
      const payload = reordered.map((s, i) => ({ id: s.id, stepNumber: i + 1 }));
      run(() => reorderSteps(payload));
    },
    [seqSteps, run]
  );

  if (loading) {
    return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading sequences…</div>;
  }

  return (
    <div>
      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
      {actionError && <div className="error-banner" style={{ marginBottom: 12 }}>{actionError}</div>}

      <div className="sequence-manager-grid">
        {/* Left: sequence list */}
        <div style={{ borderRight: "1px solid var(--border-subtle)", paddingRight: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button className="btn-secondary" onClick={handleNewSequence} disabled={busy}>
              <Plus size={13} /> New
            </button>
            <button className="btn-primary" onClick={() => setGenOpen(true)} disabled={busy}>
              <Sparkles size={13} /> AI
            </button>
            {sequences.length === 0 && (
              <button className="btn-secondary" onClick={handleSeed} disabled={busy}>
                Starter
              </button>
            )}
          </div>

          {sequences.length === 0 ? (
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>No sequences yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sequences.map((s) => {
                const active = s.id === selectedId;
                const count = stepsForSequence(steps, s.id).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      cursor: "pointer",
                      background: active ? "var(--bg-elevated)" : "transparent",
                      border: `1px solid ${active ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                      color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {count} step{count === 1 ? "" : "s"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: selected sequence editor */}
        <div>
          {!selected ? (
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
              Select or create a sequence to edit its steps.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    className="form-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <button className="btn-secondary" onClick={handleSaveSequence} disabled={busy || !name.trim()}>
                  Save details
                </button>
                <button className="btn-danger" onClick={handleDeleteSequence} disabled={busy}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>

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
                  Steps
                </span>
                <button className="btn-secondary" onClick={handleAddStep} disabled={busy}>
                  <Plus size={13} /> Add step
                </button>
              </div>

              {seqSteps.length === 0 ? (
                <div style={{ color: "var(--text-faint)", fontSize: 12 }}>No steps yet.</div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="steps">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {seqSteps.map((step, index) => (
                          <StepCard key={step.id} step={step} index={index} onChanged={reload} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </>
          )}
        </div>
      </div>

      {genOpen && (
        <GenerateSequenceModal
          onClose={() => setGenOpen(false)}
          onCreated={(id) => {
            setGenOpen(false);
            setSelectedId(id);
            reload();
          }}
        />
      )}
    </div>
  );
}
