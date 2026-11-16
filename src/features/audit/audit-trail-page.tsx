"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/ui/data-table";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { AuditEntryCard } from "@/features/audit/history-dialog";
import { useDebouncedValue } from "@/hooks/use-table-state";
import { fetchAuditTrail } from "@/lib/resources";

const LIMIT = 20;

export function AuditTrailPage() {
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [userInput, setUserInput] = useState("");
  const [page, setPage] = useState(1);
  const user = useDebouncedValue(userInput, 350);

  const query = useQuery({
    queryKey: ["audit", "list", entity, action, user, page],
    queryFn: ({ signal }) =>
      fetchAuditTrail(
        { entity: entity || undefined, action: action || undefined, user: user || undefined, offset: (page - 1) * LIMIT, limit: LIMIT },
        signal,
      ),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader title="Audit Trail" description="Who created, changed or deleted what — recorded by the TrackLab backend." />
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Data" htmlFor="audit-entity">
            <Select
              id="audit-entity"
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="tracker">Trackers</option>
              <option value="request">Requests</option>
              <option value="tracking">Trackings</option>
            </Select>
          </Field>
          <Field label="Action" htmlFor="audit-action">
            <Select
              id="audit-action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="Create">Created</option>
              <option value="Update">Updated</option>
              <option value="Delete">Deleted</option>
              <option value="HardDelete">Permanently deleted</option>
            </Select>
          </Field>
          <Field label="User" htmlFor="audit-user">
            <Input
              id="audit-user"
              type="search"
              placeholder="e.g. assessment.it"
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>

        {query.isLoading ? (
          <Spinner />
        ) : query.error ? (
          <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title="No audit entries" description="Changes made in TrackLab will be listed here." />
        ) : (
          <>
            <ol className="space-y-3">
              {items.map((entry) => (
                <AuditEntryCard key={entry.id} entry={entry} showEntity />
              ))}
            </ol>
            <Pagination page={page} limit={LIMIT} shown={items.length} total={query.data?.total ?? null} onPageChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
