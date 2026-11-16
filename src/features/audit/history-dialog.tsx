"use client";

import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Badge, EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/format";
import { fetchAuditTrail } from "@/lib/resources";
import type { AuditEntry } from "@/lib/types";

export const actionTone = {
  Create: "green",
  Update: "blue",
  Delete: "amber",
  HardDelete: "red",
} as const;

export const actionLabel = {
  Create: "Created",
  Update: "Updated",
  Delete: "Deleted",
  HardDelete: "Permanently deleted",
} as const;

/** Change history of one record, from the backend audit trail. */
export function HistoryDialog({
  open,
  onClose,
  entity,
  entityId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  entity: string;
  entityId: string | null;
  title: string;
}) {
  const query = useQuery({
    queryKey: ["audit", entity, entityId],
    queryFn: ({ signal }) => fetchAuditTrail({ entity, entityId: entityId!, offset: 0, limit: 50 }, signal),
    enabled: open && Boolean(entityId),
  });

  return (
    <Modal open={open} onClose={onClose} title={title} description="Changes made through TrackLab" size="lg">
      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : !query.data?.items.length ? (
        <EmptyState title="No recorded changes yet" description="Changes made in TrackLab from now on will appear here." />
      ) : (
        <ol className="space-y-4">
          {query.data.items.map((entry) => (
            <AuditEntryCard key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </Modal>
  );
}

export function AuditEntryCard({ entry, showEntity }: { entry: AuditEntry; showEntity?: boolean }) {
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={actionTone[entry.action] ?? "slate"}>{actionLabel[entry.action] ?? entry.action}</Badge>
        {showEntity && (
          <span className="font-medium capitalize text-slate-700">
            {entry.entity} <span className="font-mono text-xs text-slate-400">{entry.entityId.slice(0, 8)}</span>
          </span>
        )}
        <span className="text-slate-500">
          by <span className="font-medium text-slate-700">{entry.user}</span>
        </span>
        <span className="ml-auto text-xs text-slate-400">{formatDateTime(entry.timestamp)}</span>
      </div>
      {entry.changes.length > 0 && (
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="py-1 font-medium">Field</th>
              <th className="py-1 font-medium">Before</th>
              <th className="py-1 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {entry.changes.map((change) => (
              <tr key={change.field} className="border-t border-slate-100 align-top">
                <td className="py-1 pr-2 font-medium text-slate-600">{change.field}</td>
                <td className="py-1 pr-2">
                  {change.oldValue === null ? <span className="text-slate-300">—</span> : <span className="text-red-600 line-through decoration-red-300">{change.oldValue}</span>}
                </td>
                <td className="py-1">{change.newValue === null ? <span className="text-slate-300">—</span> : <span className="text-brand-700">{change.newValue}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </li>
  );
}
