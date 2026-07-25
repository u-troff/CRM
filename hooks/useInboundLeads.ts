"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InboundLead } from "@/types/inbound";
import { fetchInboundLeads } from "@/lib/inbound/queries";
import { getErrorMessage } from "@/lib/errors";

export const INBOUND_LEADS_QUERY_KEY = ["inbound-leads"] as const;

export function useInboundLeads() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: INBOUND_LEADS_QUERY_KEY,
    queryFn: fetchInboundLeads,
  });

  const leads = query.data ?? [];

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: INBOUND_LEADS_QUERY_KEY }),
    [queryClient]
  );

  // Optimistically patch a single lead in the cache. Returns the previous
  // snapshot so callers can roll back on failure.
  const patchLead = useCallback(
    (updated: InboundLead) => {
      const previous =
        queryClient.getQueryData<InboundLead[]>(INBOUND_LEADS_QUERY_KEY) ?? [];
      queryClient.setQueryData<InboundLead[]>(INBOUND_LEADS_QUERY_KEY, (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((l) => l.id === updated.id);
        if (idx < 0) return [updated, ...list];
        const next = [...list];
        next[idx] = updated;
        return next;
      });
      return previous;
    },
    [queryClient]
  );

  const removeLead = useCallback(
    (id: string) => {
      const previous =
        queryClient.getQueryData<InboundLead[]>(INBOUND_LEADS_QUERY_KEY) ?? [];
      queryClient.setQueryData<InboundLead[]>(INBOUND_LEADS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((l) => l.id !== id)
      );
      return previous;
    },
    [queryClient]
  );

  const restore = useCallback(
    (snapshot: InboundLead[]) => {
      queryClient.setQueryData<InboundLead[]>(INBOUND_LEADS_QUERY_KEY, snapshot);
    },
    [queryClient]
  );

  return {
    leads,
    loading: query.isPending,
    error: query.error
      ? getErrorMessage(query.error, "Could not load inbound leads. Refresh to retry.")
      : null,
    reload,
    patchLead,
    removeLead,
    restore,
  };
}
