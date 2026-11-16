/**
 * Helpers that make the frontend tolerant of the assessment API's response envelope
 * ({ data, success, message, code }) and of camelCase vs snake_case field names.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export function snakeToCamel(key: string) {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Recursively converts object keys like tracker_code to trackerCode. */
export function camelizeKeys<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeKeys(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, Json>).map(([key, v]) => [snakeToCamel(key), camelizeKeys(v)]),
    ) as T;
  }
  return value as T;
}

const LIST_KEYS = ["data", "items", "rows", "list", "records", "result", "results", "content"];
const TOTAL_KEYS = [
  "total",
  "totalData",
  "totalCount",
  "totalRecords",
  "totalRecord",
  "totalItems",
  "recordsTotal",
  "recordsFiltered",
  "count",
];
const TOTAL_HEADERS = ["X-Paging-TotalCount", "X-Paging-Total", "X-Paging-TotalRecords", "X-Total-Count"];

/** Finds the array of records in a response, however deeply the API wraps it. */
export function extractList<T>(body: unknown, depth = 0): T[] {
  if (Array.isArray(body)) return camelizeKeys<T[]>(body);
  if (!body || typeof body !== "object" || depth > 3) return [];

  const record = body as Record<string, unknown>;
  for (const key of LIST_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) return camelizeKeys<T[]>(value);
  }
  for (const key of LIST_KEYS) {
    const value = record[key];
    if (value && typeof value === "object") {
      const nested = extractList<T>(value, depth + 1);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

/** Finds a single record (e.g. GET /trackers/:id returns { data: {...} }). */
export function extractItem<T>(body: unknown): T | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const inner = record.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return camelizeKeys<T>(inner);
  return camelizeKeys<T>(body);
}

/** Total number of records for paging: from a response header, a body field, or null if unknown. */
export function extractTotal(body: unknown, headers?: Headers, depth = 0): number | null {
  if (depth === 0 && headers) {
    for (const name of TOTAL_HEADERS) {
      const value = Number(headers.get(name));
      if (headers.has(name) && Number.isFinite(value)) return value;
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || depth > 3) return null;

  const record = camelizeKeys<Record<string, unknown>>(body);
  for (const key of TOTAL_KEYS) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  for (const key of ["paging", "pagination", "meta", "page", "data"]) {
    const nested = record[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const total = extractTotal(nested, undefined, depth + 1);
      if (total !== null) return total;
    }
  }
  return null;
}

/** The API's success/error message, if any. */
export function extractMessage(body: unknown): string | null {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    return typeof message === "string" && message.trim() !== "" ? message : null;
  }
  return null;
}
