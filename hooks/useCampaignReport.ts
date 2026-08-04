"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCampaignTotals, fetchPeriodReport } from "@/lib/ads/queries";
import { getErrorMessage } from "@/lib/errors";

export const CAMPAIGN_TOTALS_QUERY_KEY = ["ad-campaign-totals"] as const;
export const CAMPAIGN_PERIODS_QUERY_KEY = ["ad-campaign-periods"] as const;

// Both views are computed from campaigns, spend entries and leads, so anything
// that writes to those has to drop them. Callers that only mutate — the
// campaigns page, the inbound board — take this rather than useCampaignReport
// so they don't mount (and fetch) the report itself.
export function useInvalidateCampaignReport() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CAMPAIGN_TOTALS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: CAMPAIGN_PERIODS_QUERY_KEY });
  }, [queryClient]);
}

// Read-only: both come from Postgres views, so there is nothing to patch
// optimistically — editing spend or a lead means re-reading them.
export function useCampaignReport() {
  const reload = useInvalidateCampaignReport();

  const totalsQuery = useQuery({
    queryKey: CAMPAIGN_TOTALS_QUERY_KEY,
    queryFn: fetchCampaignTotals,
  });

  const periodsQuery = useQuery({
    queryKey: CAMPAIGN_PERIODS_QUERY_KEY,
    queryFn: fetchPeriodReport,
  });

  const error = totalsQuery.error ?? periodsQuery.error;

  return {
    totals: totalsQuery.data ?? [],
    periods: periodsQuery.data ?? [],
    loading: totalsQuery.isPending || periodsQuery.isPending,
    error: error
      ? getErrorMessage(error, "Could not load the campaign report. Refresh to retry.")
      : null,
    reload,
  };
}
