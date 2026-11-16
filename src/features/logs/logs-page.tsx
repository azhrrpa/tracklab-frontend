"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { Card, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { useDebouncedValue } from "@/hooks/use-table-state";
import { toDateInput } from "@/lib/format";
import { fetchLogs } from "@/lib/resources";

const levelTone = {
  Critical: "red",
  Error: "red",
  Warning: "amber",
  Information: "blue",
  Debug: "slate",
  Trace: "slate",
} as const;

export function LogsPage() {
  const [date, setDate] = useState(() => toDateInput(new Date().toISOString()));
  const [minLevel, setMinLevel] = useState("Information");
  const [searchInput, setSearchInput] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const search = useDebouncedValue(searchInput, 350);

  const query = useQuery({
    queryKey: ["logs", date, minLevel, search, correlationId],
    queryFn: ({ signal }) =>
      fetchLogs({ date, minLevel, search: search || undefined, correlationId: correlationId || undefined, limit: 300 }, signal),
    refetchInterval: 15_000,
  });

  return (
    <>
      <PageHeader
        title="System Logs"
        description="Structured logs from the .NET backend, including errors reported by the browser."
        actions={
          <Button variant="secondary" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
            {!query.isFetching && <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        }
      />
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Date" htmlFor="logs-date">
            <Input id="logs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Minimum level" htmlFor="logs-level">
            <Select id="logs-level" value={minLevel} onChange={(e) => setMinLevel(e.target.value)}>
              <option value="Information">Information</option>
              <option value="Warning">Warning</option>
              <option value="Error">Error</option>
            </Select>
          </Field>
          <Field label="Search" htmlFor="logs-search">
            <Input id="logs-search" type="search" placeholder="e.g. trackers, login" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </Field>
        </div>

        {correlationId && (
          <p className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            Showing one request: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{correlationId}</code>
            <Button variant="ghost" size="sm" onClick={() => setCorrelationId("")}>
              <X className="h-4 w-4" /> Show all
            </Button>
          </p>
        )}

        {query.isLoading ? (
          <Spinner />
        ) : query.error ? (
          <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        ) : !query.data?.length ? (
          <EmptyState title="No log entries" description="Try another date or a lower minimum level." />
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Log entries, newest first</caption>
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Time</th>
                  <th scope="col" className="px-3 py-2 font-medium">Level</th>
                  <th scope="col" className="px-3 py-2 font-medium">Message</th>
                  <th scope="col" className="px-3 py-2 font-medium">Request ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {query.data.map((log, index) => (
                  <tr key={`${log.timestamp}-${index}`} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">{new Date(log.timestamp).toLocaleTimeString("en-GB")}</td>
                    <td className="px-3 py-2">
                      <Badge tone={levelTone[log.level as keyof typeof levelTone] ?? "slate"}>{log.level}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <p className="break-all">{log.message}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{log.category}</p>
                      {log.exception && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-red-600">Exception</summary>
                          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-red-700">{log.exception}</pre>
                        </details>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {log.correlationId && (
                        <button
                          type="button"
                          onClick={() => setCorrelationId(log.correlationId!)}
                          className="text-brand-700 hover:underline"
                          title="Show every log line of this request"
                        >
                          {log.correlationId.slice(0, 8)}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
