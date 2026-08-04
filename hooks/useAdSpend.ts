"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdSpendEntry } from "@/types/ads";
import { fetchSpendEntries } from "@/lib/ads/queries";
import { getErrorMessage } from "@/lib/errors";

export const AD_SPEND_QUERY_KEY = ["ad-spend-entries"] as const;

export function useAdSpend() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: AD_SPEND_QUERY_KEY,
    queryFn: fetchSpendEntries,
  });

  const entries = query.data ?? [];

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: AD_SPEND_QUERY_KEY }),
    [queryClient]
  );

  // Optimistically patch a single entry in the cache. Returns the previous
  // snapshot so callers can roll back on failure.
  const patchEntry = useCallback(
    (updated: AdSpendEntry) => {
      const previous =
        queryClient.getQueryData<AdSpendEntry[]>(AD_SPEND_QUERY_KEY) ?? [];
      queryClient.setQueryData<AdSpendEntry[]>(AD_SPEND_QUERY_KEY, (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((e) => e.id === updated.id);
        if (idx < 0) return [updated, ...list];
        const next = [...list];
        next[idx] = updated;
        return next;
      });
      return previous;
    },
    [queryClient]
  );

  const removeEntry = useCallback(
    (id: string) => {
      const previous =
        queryClient.getQueryData<AdSpendEntry[]>(AD_SPEND_QUERY_KEY) ?? [];
      queryClient.setQueryData<AdSpendEntry[]>(AD_SPEND_QUERY_KEY, (prev) =>
        (prev ?? []).filter((e) => e.id !== id)
      );
      return previous;
    },
    [queryClient]
  );

  const restore = useCallback(
    (snapshot: AdSpendEntry[]) => {
      queryClient.setQueryData<AdSpendEntry[]>(AD_SPEND_QUERY_KEY, snapshot);
    },
    [queryClient]
  );

  return {
    entries,
    loading: query.isPending,
    error: query.error
      ? getErrorMessage(query.error, "Could not load ad spend. Refresh to retry.")
      : null,
    reload,
    patchEntry,
    removeEntry,
    restore,
  };
}
