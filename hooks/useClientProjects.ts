"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientProject } from "@/types/client";
import { fetchClientProjects } from "@/lib/clients/queries";
import { getErrorMessage } from "@/lib/errors";

export const CLIENT_PROJECTS_QUERY_KEY = ["client-projects"] as const;

export function useClientProjects() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CLIENT_PROJECTS_QUERY_KEY,
    queryFn: fetchClientProjects,
  });

  const projects = query.data ?? [];

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CLIENT_PROJECTS_QUERY_KEY }),
    [queryClient]
  );

  // Optimistically patch a single project in the cache. Returns the previous
  // snapshot so callers can roll back on failure.
  const patchProject = useCallback(
    (updated: ClientProject) => {
      const previous =
        queryClient.getQueryData<ClientProject[]>(CLIENT_PROJECTS_QUERY_KEY) ?? [];
      queryClient.setQueryData<ClientProject[]>(CLIENT_PROJECTS_QUERY_KEY, (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((p) => p.id === updated.id);
        if (idx < 0) return [updated, ...list];
        const next = [...list];
        next[idx] = updated;
        return next;
      });
      return previous;
    },
    [queryClient]
  );

  const removeProject = useCallback(
    (id: string) => {
      const previous =
        queryClient.getQueryData<ClientProject[]>(CLIENT_PROJECTS_QUERY_KEY) ?? [];
      queryClient.setQueryData<ClientProject[]>(CLIENT_PROJECTS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((p) => p.id !== id)
      );
      return previous;
    },
    [queryClient]
  );

  const restore = useCallback(
    (snapshot: ClientProject[]) => {
      queryClient.setQueryData<ClientProject[]>(CLIENT_PROJECTS_QUERY_KEY, snapshot);
    },
    [queryClient]
  );

  return {
    projects,
    loading: query.isPending,
    error: query.error
      ? getErrorMessage(query.error, "Could not load client projects. Refresh to retry.")
      : null,
    reload,
    patchProject,
    removeProject,
    restore,
  };
}
