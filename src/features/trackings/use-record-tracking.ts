"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toRequestBody, toRequestFormValues } from "@/features/requests/request-form";
import { ApiError } from "@/lib/api-client";
import { createItem, deleteItem, fetchById, updateItem } from "@/lib/resources";
import type { LabRequest, Tracker } from "@/lib/types";
import type { TrackingFormResult } from "@/features/trackings/tracking-form";

/**
 * Saves a tracking and, if asked, moves the request's "Last Status" to the step's description,
 * so the request list always shows the latest step.
 *
 * The request on screen is updated with the saved status directly: refetching it straight after the
 * write can return the previous value (the API caches reads), as seen while testing against it.
 */
export function useRecordTracking() {
  const queryClient = useQueryClient();

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trackings"] }),
      queryClient.invalidateQueries({ queryKey: ["audit"] }),
      queryClient.invalidateQueries({ queryKey: ["requests"], predicate: (query) => query.queryKey[1] !== "detail" }),
    ]);

  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.isUnauthorized) return;
    toast.error(error instanceof Error ? error.message : "Could not save the tracking.");
  };

  const save = useMutation({
    mutationFn: async ({ trackingId, result, tracker }: { trackingId?: string; result: TrackingFormResult; tracker: Tracker | null }) => {
      if (trackingId) {
        await updateItem("trackings", trackingId, { ...result.body, isActive: true });
      } else {
        await createItem("trackings", result.body);
      }

      if (result.updateLastStatus && tracker) {
        const request = await fetchById<LabRequest>("requests", result.body.requestId);
        if (request && request.lastStatus !== tracker.description) {
          const values = { ...toRequestFormValues(request), lastStatus: tracker.description };
          await updateItem("requests", request.id, toRequestBody(values, true));
          return { requestId: request.id, lastStatus: tracker.description };
        }
      }
      return null;
    },
    onSuccess: async (statusChange, { trackingId }) => {
      toast.success(trackingId ? "Tracking updated" : "Tracking saved");
      if (statusChange) {
        queryClient.setQueryData<LabRequest | null>(["requests", "detail", statusChange.requestId], (current) =>
          current ? { ...current, lastStatus: statusChange.lastStatus } : current,
        );
      }
      await refresh();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deleteItem("trackings", id, hard),
    onSuccess: async () => {
      toast.success("Tracking removed");
      await refresh();
    },
    onError,
  });

  return { save, remove };
}
