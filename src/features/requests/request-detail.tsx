"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, History, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { HistoryDialog } from "@/features/audit/history-dialog";
import { usePermissions } from "@/features/auth/permissions";
import { RequestFormDialog, toRequestBody, type RequestFormValues } from "@/features/requests/request-form";
import { companyName, requestDate } from "@/features/requests/request-helpers";
import { TrackerIcon } from "@/features/trackers/tracker-icon";
import { TrackingFormDialog, type TrackingFormResult } from "@/features/trackings/tracking-form";
import { useRecordTracking } from "@/features/trackings/use-record-tracking";
import { useAllResource, useResourceMutations } from "@/hooks/use-resource";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatDateTime, shortId } from "@/lib/format";
import { fetchById, fetchRequestTrackings } from "@/lib/resources";
import type { LabRequest, Tracker, Tracking } from "@/lib/types";

/** Pairs every tracker step with the tracking that reached it (if any), in flow order. */
export function buildTimeline(trackers: Tracker[], trackings: Tracking[]) {
  return [...trackers]
    .filter((t) => t.isActive !== false)
    .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code))
    .map((tracker) => ({
      tracker,
      tracking: trackings.find((t) => t.isActive !== false && (t.trackerId === tracker.id || t.trackerCode === tracker.code)) ?? null,
    }));
}

export function formatTrackingValue(tracker: Tracker, value: string | null | undefined) {
  if (!value) return null;
  return tracker.actionType === "date" ? formatDate(value) : value;
}

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const requestQuery = useQuery({
    queryKey: ["requests", "detail", id],
    queryFn: ({ signal }) => fetchById<LabRequest>("requests", id, signal),
  });
  const trackingsQuery = useQuery({
    queryKey: ["trackings", "request", id],
    queryFn: ({ signal }) => fetchRequestTrackings(id, signal),
  });
  const trackersQuery = useAllResource<Tracker>("trackers");
  const { update } = useResourceMutations("requests", { singular: "Request" });
  const { save, remove } = useRecordTracking();
  const canTrack = usePermissions("trackings");
  const canEditRequest = usePermissions("requests").update;

  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recording, setRecording] = useState<{ tracker: Tracker; tracking: Tracking | null } | null>(null);
  const [removing, setRemoving] = useState<{ tracker: Tracker; tracking: Tracking } | null>(null);

  if (requestQuery.isLoading) return <Spinner label="Loading request…" />;
  if (requestQuery.error || !requestQuery.data) {
    return (
      <ErrorState
        message={requestQuery.error?.message ?? "This request could not be found."}
        onRetry={() => requestQuery.refetch()}
      />
    );
  }

  const request = requestQuery.data;
  const timeline = buildTimeline(trackersQuery.data ?? [], trackingsQuery.data ?? []);
  const done = timeline.filter((step) => step.tracking).length;
  const percent = timeline.length ? Math.round((done / timeline.length) * 100) : 0;

  const saveTracking = (result: TrackingFormResult) => {
    if (!recording) return;
    save.mutate(
      { trackingId: recording.tracking?.id, result, tracker: recording.tracker },
      { onSuccess: () => setRecording(null) },
    );
  };

  return (
    <>
      <Link href="/requests" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate-400" title={request.id}>
            {shortId(request.id, 32)}
          </p>
          <h1 className="text-2xl font-bold text-slate-800">{request.projectCode}</h1>
          <p className="text-sm uppercase text-slate-500">{companyName(request)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4" /> History
          </Button>
          {canEditRequest && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit request
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 font-semibold text-slate-800">Request details</h2>
          <dl className="space-y-3 text-sm">
            <Detail label="Request date" value={formatDate(requestDate(request))} />
            <Detail label="Due date" value={formatDate(request.dueDate)} />
            <Detail label="Last status" value={request.lastStatus ?? "-"} />
            <Detail label="Receiving status" value={request.receivingStatus ?? "-"} />
            <Detail label="Total fee" value={formatCurrency(request.totalFee)} />
            <Detail label="Received date" value={formatDate(request.receivedDate)} />
            <Detail label="Analysis started" value={formatDate(request.analysisWipDate)} />
            <Detail label="Analysis completed" value={formatDate(request.analysisCompletedDate)} />
            <Detail label="Lead time" value={request.leadTime != null ? `${request.leadTime} days` : "-"} />
            {request.createdBy && <Detail label="Created by" value={request.createdBy} />}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-800">Tracking progress</h2>
            <span className="text-sm text-slate-500">
              {done} of {timeline.length} steps · {percent}%
            </span>
          </div>
          <div
            className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tracking progress"
          >
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} />
          </div>

          {trackersQuery.isLoading || trackingsQuery.isLoading ? (
            <Spinner />
          ) : trackingsQuery.error ? (
            <ErrorState message={trackingsQuery.error.message} onRetry={() => trackingsQuery.refetch()} />
          ) : timeline.length === 0 ? (
            <EmptyState title="No tracker steps defined" description="Add steps in Master → Tracker first." />
          ) : (
            <ol className="relative">
              {timeline.map(({ tracker, tracking }, index) => (
                <li key={tracker.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span className={cn("absolute left-4 top-9 -ml-px h-[calc(100%-2.25rem)] w-0.5", tracking ? "bg-brand-300" : "bg-slate-200")} aria-hidden />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                      tracking ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {tracking ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <TrackerIcon name={tracker.icon} className="h-4 w-4" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn("font-medium", tracking ? "text-slate-800" : "text-slate-500")}>
                        {tracker.description}
                        <span className="sr-only">{tracking ? " (done)" : " (pending)"}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono">{tracker.code}</span>
                        {tracker.isParallel && <Badge tone="blue">parallel</Badge>}
                        {tracker.mandays ? <span>~{tracker.mandays} mandays</span> : null}
                      </p>
                      {tracking && (
                        <p className="mt-1 text-sm text-slate-600">
                          {formatTrackingValue(tracker, tracking.value) && (
                            <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                              {formatTrackingValue(tracker, tracking.value)}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {formatDateTime(tracking.createdOn)}
                            {tracking.createdBy && ` · ${tracking.createdBy}`}
                          </span>
                        </p>
                      )}
                    </div>
                    {tracking ? (
                      <div className="flex gap-1">
                        {canTrack.update && (
                          <Button variant="ghost" size="icon" aria-label={`Edit ${tracker.description}`} onClick={() => setRecording({ tracker, tracking })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canTrack.delete && (
                          <Button variant="ghost" size="icon" aria-label={`Remove ${tracker.description}`} onClick={() => setRemoving({ tracker, tracking })}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      canTrack.create && (
                        <Button variant="outline" size="sm" onClick={() => setRecording({ tracker, tracking: null })}>
                          <Plus className="h-4 w-4" /> Record
                        </Button>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <TrackingFormDialog
        open={Boolean(recording)}
        onClose={() => setRecording(null)}
        saving={save.isPending}
        onSubmit={saveTracking}
        tracking={recording?.tracking ?? null}
        request={request}
        tracker={recording?.tracker ?? null}
        trackers={trackersQuery.data ?? []}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove "${removing?.tracker.description ?? ""}"?`}
        message="The step will be marked as not reached for this request."
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate({ id: removing.tracking.id }, { onSuccess: () => setRemoving(null) })}
      />

      <RequestFormDialog
        open={editOpen}
        request={request}
        saving={update.isPending}
        onClose={() => setEditOpen(false)}
        onSubmit={(values: RequestFormValues) =>
          update.mutate({ id: request.id, body: toRequestBody(values, true) }, { onSuccess: () => setEditOpen(false) })
        }
      />

      <HistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} entity="request" entityId={request.id} title={`History of ${request.projectCode}`} />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
