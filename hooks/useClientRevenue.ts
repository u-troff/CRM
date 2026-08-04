"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientRevenueEntry } from "@/types/revenue";
import { fetchRevenueEntries } from "@/lib/revenue/queries";
import { getErrorMessage } from "@/lib/errors";

export const CLIENT_REVENUE_QUERY_KEY = ["client-revenue"] as const;

export function useClientRevenue() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CLIENT_REVENUE_QUERY_KEY,
    queryFn: fetchRevenueEntries,
  });

  const entries = query.data ?? [];

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CLIENT_REVENUE_QUERY_KEY }),
    [queryClient]
  );

  // Optimistically patch a single entry in the cache. Returns the previous
  // snapshot so callers can roll back on failure.
  const patchEntry = useCallback(
    (updated: ClientRevenueEntry) => {
      const previous =
        queryClient.getQueryData<ClientRevenueEntry[]>(CLIENT_REVENUE_QUERY_KEY) ?? [];
      queryClient.setQueryData<ClientRevenueEntry[]>(
        CLIENT_REVENUE_QUERY_KEY,
        (prev) => {
          const list = prev ?? [];
          const idx = list.findIndex((e) => e.id === updated.id);
          if (idx < 0) return [updated, ...list];
          const next = [...list];
          next[idx] = updated;
          return next;
        }
      );
      return previous;
    },
    [queryClient]
  );

  const removeEntry = useCallback(
    (id: string) => {
      const previous =
        queryClient.getQueryData<ClientRevenueEntry[]>(CLIENT_REVENUE_QUERY_KEY) ?? [];
      queryClient.setQueryData<ClientRevenueEntry[]>(CLIENT_REVENUE_QUERY_KEY, (prev) =>
        (prev ?? []).filter((e) => e.id !== id)
      );
      return previous;
    },
    [queryClient]
  );

  const restore = useCallback(
    (snapshot: ClientRevenueEntry[]) => {
      queryClient.setQueryData<ClientRevenueEntry[]>(CLIENT_REVENUE_QUERY_KEY, snapshot);
    },
    [queryClient]
  );

  return {
    entries,
    loading: query.isPending,
    error: query.error
      ? getErrorMessage(query.error, "Could not load client revenue. Refresh to retry.")
      : null,
    reload,
    patchEntry,
    removeEntry,
    restore,
  };
}
