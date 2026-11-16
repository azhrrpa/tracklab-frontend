"use client";

import { Filter, History, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Card, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, PageSizeSelect, Pagination, SearchInput, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { RowActions } from "@/components/ui/row-actions";
import { HistoryDialog } from "@/features/audit/history-dialog";
import { usePermissions } from "@/features/auth/permissions";
import { RequestFormDialog, toRequestBody, type RequestFormValues } from "@/features/requests/request-form";
import { companyName, requestDate } from "@/features/requests/request-helpers";
import { usePagedResource, useResourceMutations } from "@/hooks/use-resource";
import { useTableState } from "@/hooks/use-table-state";
import { formatCurrency, formatDate, shortId } from "@/lib/format";
import type { AdvancedFilter } from "@/lib/resources";
import type { LabRequest } from "@/lib/types";

type FilterValues = { projectCode: string; lastStatus: string; receivingStatus: string; operator: "AND" | "OR" };
const emptyFilter: FilterValues = { projectCode: "", lastStatus: "", receivingStatus: "", operator: "AND" };

/** Filter panel values -> include filter for the advanced paging endpoint ("||" separates alternatives). */
export function toAdvancedFilter(values: FilterValues): AdvancedFilter {
  const include: Record<string, string> = {};
  if (values.projectCode.trim()) include.project_code = values.projectCode.trim();
  if (values.lastStatus.trim()) include.last_status = values.lastStatus.trim();
  if (values.receivingStatus.trim()) include.receiving_status = values.receivingStatus.trim();
  return { include, operator: values.operator };
}

export function RequestsPage() {
  const router = useRouter();
  // Newest first. The requests table has request_date (no created_on), as found against the real API.
  const table = useTableState({ sortBy: "requestDate", sortOrder: "DESC" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState<FilterValues>(emptyFilter);
  const [appliedFilter, setAppliedFilter] = useState<FilterValues>(emptyFilter);
  const advanced = toAdvancedFilter(appliedFilter);
  const activeFilterCount = Object.keys(advanced.include ?? {}).length;

  const query = usePagedResource<LabRequest>("requests", table.params, activeFilterCount ? advanced : undefined);
  const { create, update, remove } = useResourceMutations("requests", { singular: "Request" });
  const can = usePermissions("requests");

  const [editing, setEditing] = useState<LabRequest | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<LabRequest | null>(null);
  const [hardDelete, setHardDelete] = useState(false);
  const [history, setHistory] = useState<LabRequest | null>(null);

  const rows = query.data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const submit = (values: RequestFormValues) => {
    const onSuccess = () => setFormOpen(false);
    if (editing) {
      update.mutate({ id: editing.id, body: toRequestBody(values, true) }, { onSuccess });
    } else {
      create.mutate(toRequestBody(values, false), { onSuccess });
    }
  };

  const applyFilter = (values: FilterValues) => {
    setAppliedFilter(values);
    table.setPage(1);
  };

  const columns: Column<LabRequest>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-14",
      cell: (r) => (
        <RowActions
          label={r.projectCode}
          actions={[
            { label: "Tracking progress", icon: <ListChecks className="h-4 w-4" />, onSelect: () => router.push(`/requests/${r.id}`) },
            {
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              hidden: !can.update,
              onSelect: () => {
                setEditing(r);
                setFormOpen(true);
              },
            },
            { label: "History", icon: <History className="h-4 w-4" />, onSelect: () => setHistory(r) },
            {
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              hidden: !can.delete,
              onSelect: () => {
                setHardDelete(false);
                setDeleting(r);
              },
            },
          ]}
        />
      ),
    },
    {
      key: "id",
      header: "Request ID",
      cell: (r) => (
        <Link href={`/requests/${r.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline" title={r.id}>
          {shortId(r.id)}
        </Link>
      ),
    },
    { key: "company", header: "Company Name", sortKey: "partnerId", cell: (r) => <span className="uppercase">{companyName(r)}</span> },
    { key: "projectCode", header: "Project Code", sortKey: "projectCode", cell: (r) => r.projectCode },
    { key: "requestDate", header: "Request Date", sortKey: "requestDate", cell: (r) => formatDate(requestDate(r)) },
    { key: "lastStatus", header: "Last Status", sortKey: "lastStatus", cell: (r) => r.lastStatus ?? "-" },
    {
      key: "receivingStatus",
      header: "Receiving Status",
      sortKey: "receivingStatus",
      className: "max-w-56 whitespace-normal",
      cell: (r) => r.receivingStatus ?? "-",
    },
    { key: "totalFee", header: "Total Fee", sortKey: "totalFee", className: "text-right", cell: (r) => formatCurrency(r.totalFee) },
  ];

  return (
    <>
      <PageHeader title="Lab Analysis Request" description="Manage all lab analysis requests." />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PageSizeSelect value={table.limit} onChange={table.setLimit} />
            <Button size="sm" variant={activeFilterCount ? "primary" : "outline"} onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
              <Filter className="h-4 w-4" /> Filter By
              {activeFilterCount > 0 && <Badge className="ml-1 bg-white text-brand-700">{activeFilterCount}</Badge>}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {!activeFilterCount && <SearchInput value={table.searchInput} onChange={table.setSearchInput} placeholder="Search request" />}
            {can.create && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            )}
          </div>
        </div>

        {filterOpen && (
          <form
            className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              applyFilter(draftFilter);
            }}
          >
            <Field label="Project code" htmlFor="filter-projectCode" hint="Use || for several, e.g. PRJ-1||PRJ-2">
              <Input id="filter-projectCode" value={draftFilter.projectCode} onChange={(e) => setDraftFilter({ ...draftFilter, projectCode: e.target.value })} />
            </Field>
            <Field label="Last status" htmlFor="filter-lastStatus">
              <Input id="filter-lastStatus" value={draftFilter.lastStatus} onChange={(e) => setDraftFilter({ ...draftFilter, lastStatus: e.target.value })} />
            </Field>
            <Field label="Receiving status" htmlFor="filter-receivingStatus">
              <Input
                id="filter-receivingStatus"
                value={draftFilter.receivingStatus}
                onChange={(e) => setDraftFilter({ ...draftFilter, receivingStatus: e.target.value })}
              />
            </Field>
            <Field label="Match" htmlFor="filter-operator">
              <Select
                id="filter-operator"
                value={draftFilter.operator}
                onChange={(e) => setDraftFilter({ ...draftFilter, operator: e.target.value as "AND" | "OR" })}
              >
                <option value="AND">All conditions</option>
                <option value="OR">Any condition</option>
              </Select>
            </Field>
            <div className="flex gap-2 sm:col-span-4 sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftFilter(emptyFilter);
                  applyFilter(emptyFilter);
                }}
              >
                <X className="h-4 w-4" /> Clear
              </Button>
              <Button type="submit" size="sm">
                Apply filter
              </Button>
            </div>
          </form>
        )}

        <DataTable
          caption="Lab analysis requests"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={query.isLoading}
          fetching={query.isFetching && !query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          onSort={table.toggleSort}
          sortFallback={query.data?.sortFallback}
          emptyTitle={activeFilterCount || table.searchInput ? "No requests match" : "No requests yet"}
          emptyDescription={activeFilterCount || table.searchInput ? "Try changing the search or filter." : "Create the first lab analysis request."}
          emptyAction={!activeFilterCount && !table.searchInput && can.create && <Button size="sm" onClick={openCreate}>Add request</Button>}
        />

        {rows.length > 0 && (
          <Pagination page={table.page} limit={table.limit} shown={rows.length} total={query.data?.total ?? null} onPageChange={table.setPage} />
        )}
      </Card>

      <RequestFormDialog
        open={formOpen}
        request={editing}
        saving={create.isPending || update.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete request ${deleting?.projectCode ?? ""}?`}
        message={
          hardDelete
            ? "This permanently removes the request. It cannot be undone."
            : "The request will be deactivated and hidden from lists. Its history is kept."
        }
        confirmLabel={hardDelete ? "Delete permanently" : "Delete"}
        danger
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id, hard: hardDelete }, { onSuccess: () => setDeleting(null) })}
      >
        <Checkbox
          id="request-hard-delete"
          label="Delete permanently"
          description="Remove the row from the database instead of deactivating it."
          checked={hardDelete}
          onChange={(e) => setHardDelete(e.target.checked)}
        />
      </ConfirmDialog>

      <HistoryDialog
        open={Boolean(history)}
        onClose={() => setHistory(null)}
        entity="request"
        entityId={history?.id ?? null}
        title={`History of ${history?.projectCode ?? ""}`}
      />
    </>
  );
}
