"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { SortOrder } from "@/lib/types";

export type Column<T> = {
  key: string;
  header: string;
  /** Property name sent to the API as sortBy. Leave out for columns that can't be sorted. */
  sortKey?: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading: boolean;
  fetching?: boolean;
  error: unknown;
  onRetry: () => void;
  sortBy?: string;
  sortOrder: SortOrder;
  onSort: (sortKey: string) => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  caption: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  fetching,
  error,
  onRetry,
  sortBy,
  sortOrder,
  onSort,
  emptyTitle,
  emptyDescription,
  emptyAction,
  caption,
}: DataTableProps<T>) {
  if (loading) return <Spinner />;
  if (error && rows.length === 0) {
    const apiError = error instanceof ApiError ? error : null;
    return <ErrorState message={(error as Error).message} traceId={apiError?.traceId} onRetry={onRetry} />;
  }

  return (
    <div className={cn("overflow-x-auto rounded-md border border-slate-200 transition-opacity", fetching && "opacity-60")}>
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-brand-600 text-xs font-semibold text-white">
          <tr>
            {columns.map((column) => {
              const active = column.sortKey && column.sortKey === sortBy;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn("whitespace-nowrap px-3 py-2.5", column.className)}
                  aria-sort={active ? (sortOrder === "ASC" ? "ascending" : "descending") : undefined}
                >
                  {column.sortKey ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.sortKey!)}
                      className="inline-flex items-center gap-1.5 rounded hover:text-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {column.header}
                      {active ? (
                        sortOrder === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className={cn("whitespace-nowrap px-3 py-2.5 text-slate-700", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PageSizeSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Show
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 w-20 text-sm" aria-label="Rows per page">
        {[10, 25, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search item" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Search</span>
      <Search className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-400" aria-hidden />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 w-56 pl-8" />
    </label>
  );
}

type PaginationProps = {
  page: number;
  limit: number;
  shown: number;
  total: number | null;
  onPageChange: (page: number) => void;
};

/** "Showing 1 to 10 of 18 entries" + Prev / numbers / Next. Works even if the API doesn't report a total. */
export function Pagination({ page, limit, shown, total, onPageChange }: PaginationProps) {
  const from = shown === 0 ? 0 : (page - 1) * limit + 1;
  const to = (page - 1) * limit + shown;
  const totalPages = total !== null ? Math.max(1, Math.ceil(total / limit)) : null;
  const hasNext = totalPages !== null ? page < totalPages : shown === limit;

  const pages = totalPages !== null ? pageWindow(page, totalPages) : [page];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-slate-600">
      <p aria-live="polite">
        Showing {from} to {to}
        {total !== null && <> of {total}</>} entries
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </Button>
        {pages.map((p, index) =>
          p === null ? (
            <span key={`gap-${index}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={p === page ? "primary" : "ghost"}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </nav>
    </div>
  );
}

function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(null);
    result.push(p);
  });
  return result;
}
