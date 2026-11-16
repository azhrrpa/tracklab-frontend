"use client";

import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, PageSizeSelect, Pagination, SearchInput, type Column } from "@/components/ui/data-table";
import { Badge, BoolIcon } from "@/components/ui/feedback";
import { Checkbox } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { RowActions } from "@/components/ui/row-actions";
import { HistoryDialog } from "@/features/audit/history-dialog";
import { usePermissions } from "@/features/auth/permissions";
import { TrackerIcon } from "@/features/trackers/tracker-icon";
import { normalizeNewTracker, TrackerFormDialog, type TrackerFormValues } from "@/features/trackers/tracker-form";
import { usePagedResource, useResourceMutations } from "@/hooks/use-resource";
import { useTableState } from "@/hooks/use-table-state";
import type { Tracker } from "@/lib/types";

const actionTypeTone: Record<string, "slate" | "blue" | "amber" | "green"> = {
  none: "slate",
  text: "blue",
  file: "amber",
  date: "green",
};

export function TrackersPage() {
  const table = useTableState({ sortBy: "order", sortOrder: "ASC" });
  const query = usePagedResource<Tracker>("trackers", table.params);
  const { create, update, remove } = useResourceMutations("trackers", { singular: "Tracker" });
  const can = usePermissions("trackers");

  const [editing, setEditing] = useState<Tracker | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Tracker | null>(null);
  const [hardDelete, setHardDelete] = useState(false);
  const [history, setHistory] = useState<Tracker | null>(null);

  const rows = query.data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const submit = (values: TrackerFormValues) => {
    const onSuccess = () => setFormOpen(false);
    if (editing) {
      update.mutate({ id: editing.id, body: values }, { onSuccess });
    } else {
      // isActive is ignored by the backend on create.
      create.mutate(normalizeNewTracker(values), { onSuccess });
    }
  };

  const columns: Column<Tracker>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-14",
      cell: (t) => (
        <RowActions
          label={t.code}
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
            {
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              hidden: !can.delete,
              onSelect: () => {
                setHardDelete(false);
                setDeleting(t);
              },
            },
          ]}
        />
      ),
    },
    { key: "code", header: "Code", sortKey: "code", cell: (t) => <span className="font-mono text-xs font-semibold">{t.code}</span> },
    {
      key: "parentCode",
      header: "Parent Code",
      sortKey: "parentCode",
      cell: (t) => (t.parentCode ? <span className="font-mono text-xs">{t.parentCode}</span> : <span className="text-slate-300">—</span>),
    },
    { key: "description", header: "Description", sortKey: "description", cell: (t) => t.description },
    { key: "order", header: "Order", sortKey: "order", className: "text-center", cell: (t) => t.order },
    { key: "icon", header: "Icon", className: "text-center", cell: (t) => <TrackerIcon name={t.icon} /> },
    {
      key: "actionType",
      header: "Action Type",
      sortKey: "actionType",
      cell: (t) => <Badge tone={actionTypeTone[t.actionType] ?? "slate"}>{t.actionType}</Badge>,
    },
    { key: "moduleFlow", header: "Module Flow", sortKey: "moduleFlow", cell: (t) => t.moduleFlow },
    { key: "mandays", header: "Mandays", sortKey: "mandays", className: "text-center", cell: (t) => t.mandays ?? "-" },
    { key: "isParallel", header: "Parallel", className: "text-center", cell: (t) => <BoolIcon value={t.isParallel} label="Parallel" /> },
    { key: "isPublic", header: "Public", className: "text-center", cell: (t) => <BoolIcon value={t.isPublic} label="Public" /> },
    {
      key: "isUsingNotification",
      header: "Notification",
      className: "text-center",
      cell: (t) => <BoolIcon value={t.isUsingNotification} label="Notification" />,
    },
  ];

  return (
    <>
      <PageHeader title="Master Tracker" description="Manage tracker data — the steps a lab analysis request goes through." />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <PageSizeSelect value={table.limit} onChange={table.setLimit} />
          <div className="flex items-center gap-2">
            <SearchInput value={table.searchInput} onChange={table.setSearchInput} />
            {can.create && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            )}
          </div>
        </div>

        <DataTable
          caption="Master trackers"
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
          emptyTitle={table.searchInput ? "No trackers match your search" : "No trackers yet"}
          emptyDescription={table.searchInput ? "Try a different keyword." : "Add the first step of your flow."}
          emptyAction={!table.searchInput && can.create && <Button size="sm" onClick={openCreate}>Add tracker</Button>}
        />

        {rows.length > 0 && (
          <Pagination page={table.page} limit={table.limit} shown={rows.length} total={query.data?.total ?? null} onPageChange={table.setPage} />
        )}
      </Card>

      <TrackerFormDialog
        open={formOpen}
        tracker={editing}
        saving={create.isPending || update.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete tracker ${deleting?.code ?? ""}?`}
        message={
          hardDelete
            ? "This permanently removes the tracker. It cannot be undone."
            : "The tracker will be deactivated and hidden from lists. Its history is kept."
        }
        confirmLabel={hardDelete ? "Delete permanently" : "Delete"}
        danger
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate({ id: deleting.id, hard: hardDelete }, { onSuccess: () => setDeleting(null) })
        }
      >
        <Checkbox
          id="tracker-hard-delete"
          label="Delete permanently"
          description="Remove the row from the database instead of deactivating it."
          checked={hardDelete}
          onChange={(e) => setHardDelete(e.target.checked)}
        />
      </ConfirmDialog>

      <HistoryDialog
        open={Boolean(history)}
        onClose={() => setHistory(null)}
        entity="tracker"
        entityId={history?.id ?? null}
        title={`History of ${history?.code ?? ""}`}
      />
    </>
  );
}
