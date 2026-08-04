"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BoardKey, CustomFieldDefinition } from "@/types/custom";
import { fetchCustomFieldDefinitions } from "@/lib/custom/queries";
import { getErrorMessage } from "@/lib/errors";

export const customFieldsQueryKey = (boardKey: BoardKey) =>
  ["custom-fields", boardKey] as const;

export function useCustomFields(boardKey: BoardKey) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: customFieldsQueryKey(boardKey),
    queryFn: () => fetchCustomFieldDefinitions(boardKey),
    // Definitions change when someone edits them, not on their own — no point
    // revalidating this on every board visit.
    staleTime: 5 * 60_000,
  });

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: customFieldsQueryKey(boardKey) }),
    [queryClient, boardKey]
  );

  return {
    definitions: (query.data ?? []) as CustomFieldDefinition[],
    loading: query.isPending,
    error: query.error
      ? getErrorMessage(query.error, "Could not load custom fields. Refresh to retry.")
      : null,
    reload,
  };
}
