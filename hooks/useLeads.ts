"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lead } from "@/types/lead";
import { storage } from "@/lib/storage";
import { getErrorMessage } from "@/lib/errors";

export const LEADS_QUERY_KEY = ["leads"] as const;

interface UseLeadsReturn {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveLead: (lead: Lead) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  deleteLeads: (ids: string[]) => Promise<void>;
  saveLeads: (leads: Lead[]) => Promise<void>;
  assignNiche: (ids: string[], niche: Lead["niche"]) => Promise<void>;
}

export function useLeads(): UseLeadsReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: LEADS_QUERY_KEY,
    queryFn: () => storage.getLeads(),
  });

  const leads = query.data ?? [];

  // Optimistically patch the cached list, returning the snapshot for rollback.
  const optimistic = useCallback(
    (updater: (prev: Lead[]) => Lead[]) => {
      const previous = queryClient.getQueryData<Lead[]>(LEADS_QUERY_KEY) ?? [];
      queryClient.setQueryData<Lead[]>(LEADS_QUERY_KEY, updater(previous));
      return previous;
    },
    [queryClient]
  );

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY }),
    [queryClient]
  );

  const saveMutation = useMutation({
    mutationFn: (lead: Lead) => storage.saveLead(lead),
    onMutate: (lead) =>
      optimistic((prev) => {
        const idx = prev.findIndex((item) => item.id === lead.id);
        if (idx < 0) return [lead, ...prev];
        const next = [...prev];
        next[idx] = lead;
        return next;
      }),
    onError: (_err, _lead, previous) => {
      if (previous) queryClient.setQueryData(LEADS_QUERY_KEY, previous);
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => storage.deleteLead(id),
    onMutate: (id) => optimistic((prev) => prev.filter((l) => l.id !== id)),
    onError: (_err, _id, previous) => {
      if (previous) queryClient.setQueryData(LEADS_QUERY_KEY, previous);
    },
    onSettled: invalidate,
  });

  const deleteManyMutation = useMutation({
    mutationFn: (ids: string[]) => storage.deleteLeads(ids),
    onMutate: (ids) => {
      const idSet = new Set(ids);
      return optimistic((prev) => prev.filter((l) => !idSet.has(l.id)));
    },
    onError: (_err, _ids, previous) => {
      if (previous) queryClient.setQueryData(LEADS_QUERY_KEY, previous);
    },
    onSettled: invalidate,
  });

  const saveManyMutation = useMutation({
    mutationFn: (newLeads: Lead[]) => storage.saveLeads(newLeads),
    onSettled: invalidate,
  });

  const assignNicheMutation = useMutation({
    mutationFn: ({ ids, niche }: { ids: string[]; niche: Lead["niche"] }) =>
      storage.assignNiche(ids, niche),
    onMutate: ({ ids, niche }) => {
      const idSet = new Set(ids);
      return optimistic((prev) =>
        prev.map((l) => (idSet.has(l.id) ? { ...l, niche: niche ?? null } : l))
      );
    },
    onError: (_err, _vars, previous) => {
      if (previous) queryClient.setQueryData(LEADS_QUERY_KEY, previous);
    },
    onSettled: invalidate,
  });

  const reload = useCallback(async () => {
    await invalidate();
  }, [invalidate]);

  const saveLead = useCallback((lead: Lead) => saveMutation.mutateAsync(lead), [saveMutation]);
  const deleteLead = useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation]);
  const deleteLeads = useCallback(
    (ids: string[]) => deleteManyMutation.mutateAsync(ids),
    [deleteManyMutation]
  );
  const saveLeads = useCallback(
    (newLeads: Lead[]) => saveManyMutation.mutateAsync(newLeads),
    [saveManyMutation]
  );
  const assignNiche = useCallback(
    (ids: string[], niche: Lead["niche"]) => assignNicheMutation.mutateAsync({ ids, niche }),
    [assignNicheMutation]
  );

  const activeError =
    query.error ??
    saveMutation.error ??
    deleteMutation.error ??
    deleteManyMutation.error ??
    saveManyMutation.error ??
    assignNicheMutation.error;

  return {
    leads,
    loading: query.isPending,
    error: activeError
      ? getErrorMessage(activeError, "Could not load leads. Check your connection and refresh.")
      : null,
    reload,
    saveLead,
    deleteLead,
    deleteLeads,
    saveLeads,
    assignNiche,
  };
}
