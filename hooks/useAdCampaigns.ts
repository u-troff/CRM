"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdCampaign } from "@/types/ads";
import { fetchAdCampaigns } from "@/lib/ads/queries";
import { getErrorMessage } from "@/lib/errors";

export const AD_CAMPAIGNS_QUERY_KEY = ["ad-campaigns"] as const;

export function useAdCampaigns() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: AD_CAMPAIGNS_QUERY_KEY,
    queryFn: fetchAdCampaigns,
  });

  const campaigns = query.data ?? [];

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: AD_CAMPAIGNS_QUERY_KEY }),
    [queryClient]
  );

  // Optimistically patch a single campaign in the cache. Returns the previous
  // snapshot so callers can roll back on failure.
  const patchCampaign = useCallback(
    (updated: AdCampaign) => {
      const previous =
        queryClient.getQueryData<AdCampaign[]>(AD_CAMPAIGNS_QUERY_KEY) ?? [];
      queryClient.setQueryData<AdCampaign[]>(AD_CAMPAIGNS_QUERY_KEY, (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((c) => c.id === updated.id);
        if (idx < 0) return [updated, ...list];
        const next = [...list];
        next[idx] = updated;
        return next;
      });
      return previous;
    },
    [queryClient]
  );

  const removeCampaign = useCallback(
    (id: string) => {
      const previous =
        queryClient.getQueryData<AdCampaign[]>(AD_CAMPAIGNS_QUERY_KEY) ?? [];
      queryClient.setQueryData<AdCampaign[]>(AD_CAMPAIGNS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((c) => c.id !== id)
      );
      return previous;
    },
    [queryClient]
  );

  const restore = useCallback(
    (snapshot: AdCampaign[]) => {
      queryClient.setQueryData<AdCampaign[]>(AD_CAMPAIGNS_QUERY_KEY, snapshot);
    },
    [queryClient]
  );

  return {
    campaigns,
    loading: query.isPending,
    error: query.error
      ? getErrorMessage(query.error, "Could not load ad campaigns. Refresh to retry.")
      : null,
    reload,
    patchCampaign,
    removeCampaign,
    restore,
  };
}
