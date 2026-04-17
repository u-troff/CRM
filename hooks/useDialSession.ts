"use client";

import { useState, useCallback } from "react";
import { Lead } from "@/types/lead";
import { buildDialQueue, getQueueIndex, getNextInQueue, getPrevInQueue } from "@/lib/leads/queue";

export function useDialSession(allLeads: Lead[]) {
  const queue = buildDialQueue(allLeads);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentLead = queue[currentIndex] ?? null;
  const total = queue.length;

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
