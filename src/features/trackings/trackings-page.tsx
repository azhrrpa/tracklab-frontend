"use client";

import { ExternalLink, History, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, PageSizeSelect, Pagination, SearchInput, type Column } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/modal";
import { RowActions } from "@/components/ui/row-actions";
import { HistoryDialog } from "@/features/audit/history-dialog";
import { usePermissions } from "@/features/auth/permissions";
import { companyName } from "@/features/requests/request-helpers";
import { formatTrackingValue } from "@/features/requests/request-detail";
import { TrackerIcon } from "@/features/trackers/tracker-icon";
import { TrackingFormDialog, type TrackingFormResult } from "@/features/trackings/tracking-form";
import { useRecordTracking } from "@/features/trackings/use-record-tracking";
import { useAllResource, usePagedResource } from "@/hooks/use-resource";
import { useTableState } from "@/hooks/use-table-state";
import { formatDateTime } from "@/lib/format";
import type { LabRequest, Tracker, Tracking } from "@/lib/types";

/** Rebuilds the tracker from the fields the trackings endpoint joins in (used when the tracker is gone). */
export function trackerFromTracking(t: Tracking): Tracker | undefined {
  if (!t.trackerDescription && !t.trackerCode) return undefined;
  return {
    id: t.trackerId,
    code: t.trackerCode ?? "",
    parentCode: t.trackerParentCode ?? null,
    description: t.trackerDescription ?? t.trackerCode ?? "",
    actionType: t.trackerActionType ?? "none",
    moduleFlow: t.trackerModuleFlow ?? "",
    icon: t.trackerIcon ?? null,
    order: t.trackerOrder ?? 0,
    mandays: t.trackerMandays ?? null,
    isParallel: Boolean(t.trackerIsParallel),
    isPublic: Boolean(t.trackerIsPublic),
    isUsingNotification: Boolean(t.trackerIsUsingNotification),
  };
}

export function TrackingsPage() {
  const table = useTableState();
  const query = usePagedResource<Tracking>("trackings", table.params);
  const { data: trackers = [] } = useAllResource<Tracker>("trackers");
  const { data: requests = [] } = useAllResource<LabRequest>("requests");
  const { save, remove } = useRecordTracking();
  const can = usePermissions("trackings");

  const trackerById = useMemo(() => new Map(trackers.map((t) => [t.id, t])), [trackers]);
  const trackerByCode = useMemo(() => new Map(trackers.map((t) => [t.code, t])), [trackers]);
  const requestById = useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);
  const trackerOf = (t: Tracking) =>
    trackerById.get(t.trackerId) ?? (t.trackerCode ? trackerByCode.get(t.trackerCode) : undefined) ?? trackerFromTracking(t);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tracking | null>(null);
  const [deleting, setDeleting] = useState<Tracking | null>(null);
  const [history, setHistory] = useState<Tracking | null>(null);

  const rows = query.data?.items ?? [];

  const submit = (result: TrackingFormResult) => {
    const tracker = trackers.find((t) => t.id === result.body.trackerId) ?? null;
    save.mutate({ trackingId: editing?.id, result, tracker }, { onSuccess: () => setFormOpen(false) });
  };

  const columns: Column<Tracking>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-14",
      cell: (t) => (
        <RowActions
          label={t.trackerCode ?? t.id}
          actions={[
            {
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              hidden: !can.update,
              onSelect: () => {
                setEditing(t);
                setFormOpen(true);
              },
            },
            { label: "History", icon: <History className="h-4 w-4" />, onSelect: () => setHistory(t) },
            { label: "Delete", icon: <Trash2 className="h-4 w-4" />, danger: true, hidden: !can.delete, onSelect: () => setDeleting(t) },
          ]}
        />
      ),
    },
    {
      key: "request",
      header: "Request",
      sortKey: "requestId",
      cell: (t) => {
        const request = requestById.get(t.requestId);
        return (
          <Link href={`/requests/${t.requestId}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
            {request ? `${request.projectCode} · ${companyName(request)}` : t.requestId.slice(0, 8)}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        );
      },
    },
    {
      key: "step",
      header: "Step",
      sortKey: "trackerId",
      cell: (t) => {
        const tracker = trackerOf(t);
        return (
          <span className="inline-flex items-center gap-2">
            <TrackerIcon name={tracker?.icon} />
            <span>
              {tracker?.description ?? t.trackerCode ?? "-"}
              <span className="ml-1.5 font-mono text-xs text-slate-400">{tracker?.code ?? t.trackerCode}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "value",
      header: "Value",
      sortKey: "value",
      cell: (t) => {
        const tracker = trackerOf(t);
        return (tracker ? formatTrackingValue(tracker, t.value) : t.value) ?? <span className="text-slate-300">—</span>;
      },
    },
    { key: "createdOn", header: "Recorded On", sortKey: "createdOn", cell: (t) => formatDateTime(t.createdOn) },
    { key: "createdBy", header: "Recorded By", sortKey: "createdBy", cell: (t) => t.createdBy ?? "-" },
  ];

  const editingTracker = editing ? (trackerOf(editing) ?? null) : null;

  return (
    <>
      <PageHeader title="Tracking Progress" description="Every step recorded for every request." />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <PageSizeSelect value={table.limit} onChange={table.setLimit} />
          <div className="flex items-center gap-2">
            <SearchInput value={table.searchInput} onChange={table.setSearchInput} placeholder="Search tracking" />
            {can.create && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            )}
          </div>
        </div>

        <DataTable
          caption="Trackings"
          columns={columns}
          rows={rows}
          rowKey={(t) => t.id}
          loading={query.isLoading}
          fetching={query.isFetching && !query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          onSort={table.toggleSort}
          sortFallback={query.data?.sortFallback}
          emptyTitle={table.searchInput ? "No trackings match your search" : "No trackings yet"}
          emptyDescription="Record a step from a request's tracking progress page, or use Add."
        />

        {rows.length > 0 && (
          <Pagination page={table.page} limit={table.limit} shown={rows.length} total={query.data?.total ?? null} onPageChange={table.setPage} />
        )}
      </Card>

      <TrackingFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        saving={save.isPending}
        onSubmit={submit}
        tracking={editing}
        request={editing ? (requestById.get(editing.requestId) ?? null) : null}
        requests={requests}
        tracker={editingTracker}
        trackers={trackers}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this tracking?"
        message="The step will be marked as not reached for its request."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })}
      />

      <HistoryDialog open={Boolean(history)} onClose={() => setHistory(null)} entity="tracking" entityId={history?.id ?? null} title="Tracking history" />
    </>
  );
}
