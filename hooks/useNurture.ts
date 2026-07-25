"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LeadActivity, NurtureSequence, NurtureStep } from "@/types/inbound";
import { fetchActivity, fetchSequences, fetchSteps } from "@/lib/inbound/queries";
import { getErrorMessage } from "@/lib/errors";

export const SEQUENCES_QUERY_KEY = ["nurture-sequences"] as const;
export const STEPS_QUERY_KEY = ["nurture-steps"] as const;
export const activityQueryKey = (leadId: string) =>
  ["lead-activity", leadId] as const;

// Sequences + their steps (shared by the Nurture tab and the sequence manager).
export function useNurture() {
  const queryClient = useQueryClient();

  const sequencesQuery = useQuery({
    queryKey: SEQUENCES_QUERY_KEY,
    queryFn: fetchSequences,
  });

  const stepsQuery = useQuery({
    queryKey: STEPS_QUERY_KEY,
    queryFn: fetchSteps,
  });

  const reload = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SEQUENCES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: STEPS_QUERY_KEY }),
    ]);
  }, [queryClient]);

  const sequences: NurtureSequence[] = sequencesQuery.data ?? [];
  const steps: NurtureStep[] = stepsQuery.data ?? [];

  return {
    sequences,
    steps,
    loading: sequencesQuery.isPending || stepsQuery.isPending,
    error:
      sequencesQuery.error || stepsQuery.error
        ? getErrorMessage(
            sequencesQuery.error ?? stepsQuery.error,
            "Could not load nurture sequences."
          )
        : null,
    reload,
  };
}

// Reverse-chronological activity feed for a single lead.
export function useLeadActivity(leadId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: activityQueryKey(leadId),
    queryFn: () => fetchActivity(leadId),
    enabled: !!leadId,
  });

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: activityQueryKey(leadId) }),
    [queryClient, leadId]
  );

  return {
    activity: (query.data ?? []) as LeadActivity[],
    loading: query.isPending,
    error: query.error
      ? getErrorMessage(query.error, "Could not load activity.")
      : null,
    reload,
  };
}
