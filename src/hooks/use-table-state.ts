"use client";

import { useEffect, useState } from "react";
import type { PageParams, SortOrder } from "@/lib/types";

/** Paging, sorting and debounced search state for a server-side table. */
export function useTableState(initial: { sortBy?: string; sortOrder?: SortOrder; limit?: number } = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initial.limit ?? 10);
  const [sortBy, setSortBy] = useState(initial.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initial.sortOrder ?? "ASC");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);

  // A new search starts again from page 1 (state adjusted during render, as React recommends).
  const [previousSearch, setPreviousSearch] = useState(search);
  if (search !== previousSearch) {
    setPreviousSearch(search);
    setPage(1);
  }

  const params: PageParams = {
    offset: (page - 1) * limit,
    limit,
    sortBy,
    sortOrder,
    search: search || undefined,
  };

  return {
    params,
    page,
    setPage,
    limit,
    setLimit: (value: number) => {
      setLimitState(value);
      setPage(1);
    },
    sortBy,
    sortOrder,
    toggleSort: (column: string) => {
      if (sortBy === column) {
        setSortOrder((order) => (order === "ASC" ? "DESC" : "ASC"));
      } else {
        setSortBy(column);
        setSortOrder("ASC");
      }
      setPage(1);
    },
    searchInput,
    setSearchInput,
  };
}

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
