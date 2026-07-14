"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { upsertDailyLog } from "@/lib/outreach/mutations";
import { CHANNELS, type ChannelKey } from "@/lib/outreach/constants";
import { todayISO } from "@/lib/outreach/date";
import { getErrorMessage } from "@/lib/errors";
import type { DailyOutreachLog } from "@/lib/outreach/queries";

const DEBOUNCE_MS = 600;

type Counts = Record<ChannelKey, number>;

function emptyCounts(): Counts {
  return CHANNELS.reduce((acc, c) => {
    acc[c.key] = 0;
    return acc;
  }, {} as Counts);
}

function countsFromLog(log: DailyOutreachLog | null): Counts {
  const counts = emptyCounts();
  if (!log) return counts;
  for (const { key } of CHANNELS) counts[key] = log[key];
  return counts;
}

interface UseDailyOutreachLogReturn {
  counts: Counts;
  notes: string;
  saving: boolean;
  savedAt: number | null;
  error: string | null;
  adjust: (channel: ChannelKey, delta: 1 | -1) => void;
  setNotes: (notes: string) => void;
  resetAll: () => Promise<void>;
}

/**
 * Local state + debounced upsert for today's outreach log. Pages that fetch
 * initialData server-side hydrate instantly; the collapsible sidebar widget
 * on /pipeline and /kanban passes null and hydrates client-side on mount.
 */
export function useDailyOutreachLog(initialData: DailyOutreachLog | null): UseDailyOutreachLogReturn {
  const logDate = todayISO();
  const [counts, setCounts] = useState<Counts>(() => countsFromLog(initialData));
  const [notes, setNotesState] = useState(initialData?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirtyRef = useRef<Set<ChannelKey | "notes">>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ counts, notes });
  latestRef.current = { counts, notes };

  useEffect(() => {
    if (initialData) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("daily_outreach_log")
        .select("*")
        .eq("log_date", logDate)
        .maybeSingle();
      if (data) {
        setCounts(countsFromLog(data));
        setNotesState(data.notes ?? "");
      }
    })();
    // Only ever hydrate once, on mount, when no server-fetched data was provided.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flush = useCallback(async () => {
    const dirty = Array.from(dirtyRef.current);
    dirtyRef.current.clear();
    if (dirty.length === 0) return;

    const { counts: c, notes: n } = latestRef.current;
    const patch: Record<string, number | string | null> = {};
    for (const field of dirty) {
      patch[field] = field === "notes" ? n : c[field];
    }

    setSaving(true);
    setError(null);
    try {
      await upsertDailyLog(logDate, patch);
      setSavedAt(Date.now());
    } catch (e) {
      setError(getErrorMessage(e, "Failed to save. Try again."));
    } finally {
      setSaving(false);
    }
  }, [logDate]);

  const scheduleSave = useCallback(
    (field: ChannelKey | "notes") => {
      dirtyRef.current.add(field);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const adjust = useCallback(
    (channel: ChannelKey, delta: 1 | -1) => {
      setCounts((prev) => ({ ...prev, [channel]: Math.max(0, prev[channel] + delta) }));
      scheduleSave(channel);
    },
    [scheduleSave]
  );

  const setNotes = useCallback(
    (value: string) => {
      setNotesState(value);
      scheduleSave("notes");
    },
    [scheduleSave]
  );

  const resetAll = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dirtyRef.current.clear();
    const zeroed = emptyCounts();
    setCounts(zeroed);
    setError(null);
    setSaving(true);
    try {
      const patch = CHANNELS.reduce((acc, c) => {
        acc[c.key] = 0;
        return acc;
      }, {} as Record<string, number>);
      await upsertDailyLog(logDate, patch);
      setSavedAt(Date.now());
    } catch (e) {
      setError(getErrorMessage(e, "Failed to reset. Try again."));
    } finally {
      setSaving(false);
    }
  }, [logDate]);

  return { counts, notes, saving, savedAt, error, adjust, setNotes, resetAll };
}
