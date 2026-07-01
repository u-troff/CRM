"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Lead } from "@/types/lead";
import { buildDialQueue, getQueueIndex, getNextInQueue, getPrevInQueue } from "@/lib/leads/queue";

// Remembers which lead you were on so navigating away (e.g. to research a
// lead elsewhere) and back into Dial Mode resumes at the same lead instead
// of restarting the queue at index 0.
export const ACTIVE_LEAD_KEY = "dial_active_lead_id";

function readStoredLeadId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_LEAD_KEY);
}

export function useDialSession(allLeads: Lead[]) {
  const queue = buildDialQueue(allLeads);
  const snappedToStored = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const storedId = readStoredLeadId();
    const idx = storedId ? queue.findIndex((l) => l.id === storedId) : -1;
    if (idx >= 0) snappedToStored.current = true;
    return idx >= 0 ? idx : 0;
  });

  // Leads load asynchronously, so the queue is often empty on first render
  // (the lookup above misses). Once the real queue arrives, snap to the
  // remembered/deep-linked lead a single time.
  useEffect(() => {
    if (snappedToStored.current || queue.length === 0) return;
    const storedId = readStoredLeadId();
    if (!storedId) {
      snappedToStored.current = true;
      return;
    }
    const idx = queue.findIndex((l) => l.id === storedId);
    if (idx >= 0) {
      snappedToStored.current = true;
      setCurrentIndex(idx);
    }
  }, [queue]);

  const currentLead = queue[currentIndex] ?? null;
  const total = queue.length;

  useEffect(() => {
    if (typeof window === "undefined" || !currentLead) return;
    window.localStorage.setItem(ACTIVE_LEAD_KEY, currentLead.id);
  }, [currentLead]);

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, queue.length - 1));
  }, [queue.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goToLead = useCallback(
    (leadId: string) => {
      const idx = queue.findIndex((l) => l.id === leadId);
      if (idx >= 0) setCurrentIndex(idx);
    },
    [queue]
  );

  const advanceAfterOutcome = useCallback(() => {
    // After logging outcome, try to advance (queue may have changed)
    setCurrentIndex((i) => Math.min(i, queue.length - 1));
    // Advance to next after a short delay to allow state update
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, queue.length - 1));
    }, 50);
  }, [queue.length]);

  return {
    queue,
    currentLead,
    currentIndex,
    total,
    goToNext,
    goToPrev,
    goToLead,
    advanceAfterOutcome,
    hasPrev: currentIndex > 0,
    hasNext: currentIndex < queue.length - 1,
  };
}
