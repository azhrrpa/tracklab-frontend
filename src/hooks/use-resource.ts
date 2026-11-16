"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import {
  createItem,
  deleteItem,
  fetchAdvancedPage,
  fetchAll,
  fetchPage,
  updateItem,
  type AdvancedFilter,
  type ResourceName,
} from "@/lib/resources";
import type { PageParams } from "@/lib/types";

/** One page of a resource. The previous page stays on screen while the next one loads. */
export function usePagedResource<T>(resource: ResourceName, params: PageParams, filter?: AdvancedFilter) {
  const hasFilter = Boolean(
    filter &&
      [filter.include, filter.exclude].some((f) => f && Object.values(f).some((v) => v.trim() !== "")),
  );

  return useQuery({
    queryKey: [resource, "page", params, hasFilter ? filter : null],
    queryFn: ({ signal }) =>
      hasFilter && filter
        ? fetchAdvancedPage<T>(resource, params, filter, signal)
        : fetchPage<T>(resource, params, signal),
    placeholderData: keepPreviousData,
  });
}

/** Every record of a resource (for dropdowns). Cached for a minute. */
export function useAllResource<T>(resource: ResourceName, enabled = true) {
  return useQuery({
    queryKey: [resource, "all"],
    queryFn: ({ signal }) => fetchAll<T>(resource, signal),
    staleTime: 60_000,
    enabled,
  });
}

type MutationLabels = { singular: string };

/** Create / update / delete with toasts, and refetch of every list of that resource afterwards. */
export function useResourceMutations(resource: ResourceName, labels: MutationLabels) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [resource] }),
      queryClient.invalidateQueries({ queryKey: ["audit"] }),
    ]);

  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.isUnauthorized) return; // handled globally
    toast.error(error instanceof Error ? error.message : "Something went wrong.");
  };

  const create = useMutation({
    mutationFn: (body: unknown) => createItem(resource, body),
    onSuccess: async () => {
      toast.success(`${labels.singular} created`);
      await invalidate();
    },
    onError,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => updateItem(resource, id, body),
    onSuccess: async () => {
      toast.success(`${labels.singular} updated`);
      await invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deleteItem(resource, id, hard),
    onSuccess: async (_, { hard }) => {
      toast.success(hard ? `${labels.singular} permanently deleted` : `${labels.singular} deleted`);
      await invalidate();
    },
    onError,
  });

  return { create, update, remove };
}
