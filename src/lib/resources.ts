import { apiRequest } from "@/lib/api-client";
import { extractItem, extractList, extractTotal } from "@/lib/normalize";
import type { AuditEntry, CurrentUser, LogRecord, PageParams, Paged, Tracking } from "@/lib/types";

/** The three CRUD resources the backend exposes under /api. */
export type ResourceName = "trackers" | "requests" | "trackings";

export async function fetchPage<T>(resource: ResourceName, params: PageParams, signal?: AbortSignal): Promise<Paged<T>> {
  const { data, headers } = await apiRequest(`/${resource}`, {
    query: { ...params, search: params.search?.trim() || undefined },
    signal,
  });
  return { items: extractList<T>(data), total: extractTotal(data, headers), sortFallback: headers.get("X-Sort-Fallback") };
}

export type AdvancedFilter = {
  include?: Record<string, string>;
  exclude?: Record<string, string>;
  operator?: "AND" | "OR";
};

export async function fetchAdvancedPage<T>(
  resource: ResourceName,
  params: PageParams,
  filter: AdvancedFilter,
  signal?: AbortSignal,
): Promise<Paged<T>> {
  const nonEmpty = (f?: Record<string, string>) =>
    f && Object.values(f).some((v) => v.trim() !== "") ? JSON.stringify(f) : undefined;

  const { data, headers } = await apiRequest(`/${resource}/advanced`, {
    query: {
      offset: params.offset,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      operator: filter.operator ?? "AND",
      ignoreCase: true,
      include: nonEmpty(filter.include),
      exclude: nonEmpty(filter.exclude),
    },
    signal,
  });
  return { items: extractList<T>(data), total: extractTotal(data, headers), sortFallback: headers.get("X-Sort-Fallback") };
}

const ALL_PAGE_SIZE = 100;
const ALL_MAX_PAGES = 20;

/**
 * Every record of a resource (for dropdowns and the tracking timeline), read page by page through
 * the paging endpoint, which is the one verified against the real API.
 */
export async function fetchAll<T>(resource: ResourceName, signal?: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; page < ALL_MAX_PAGES; page++) {
    const result = await fetchPage<T>(resource, { offset: page * ALL_PAGE_SIZE, limit: ALL_PAGE_SIZE, sortBy: "id", sortOrder: "ASC" }, signal);
    items.push(...result.items);
    const done = result.items.length < ALL_PAGE_SIZE || (result.total !== null && items.length >= result.total);
    if (done) break;
  }
  return items;
}

export async function fetchById<T>(resource: ResourceName, id: string, signal?: AbortSignal): Promise<T | null> {
  const { data } = await apiRequest(`/${resource}/${id}`, { signal });
  return extractItem<T>(data);
}

export async function createItem(resource: ResourceName, body: unknown) {
  return apiRequest(`/${resource}`, { method: "POST", body });
}

export async function updateItem(resource: ResourceName, id: string, body: unknown) {
  return apiRequest(`/${resource}/${id}`, { method: "PUT", body });
}

export async function deleteItem(resource: ResourceName, id: string, hard = false) {
  return apiRequest(`/${resource}/${id}`, { method: "DELETE", query: { hard: hard || undefined } });
}

export async function fetchRequestTrackings(requestId: string, signal?: AbortSignal): Promise<Tracking[]> {
  const { data } = await apiRequest(`/requests/${requestId}/trackings`, { signal });
  return extractList<Tracking>(data);
}

// ---------- Auth ----------

export async function login(username: string, password: string) {
  const { data } = await apiRequest<CurrentUser>("/auth/login", { method: "POST", body: { username, password } });
  return data;
}

export async function logout() {
  await apiRequest("/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser(signal?: AbortSignal) {
  const { data } = await apiRequest<CurrentUser>("/auth/me", { signal });
  return data;
}

// ---------- Audit trail & logs (served by our own .NET backend) ----------

export type AuditQuery = {
  entity?: string;
  entityId?: string;
  user?: string;
  action?: string;
  offset: number;
  limit: number;
};

export async function fetchAuditTrail(query: AuditQuery, signal?: AbortSignal) {
  const { data } = await apiRequest<{ items: AuditEntry[]; total: number }>("/audit-trails", { query, signal });
  return data;
}

export type LogQuery = {
  date?: string;
  minLevel?: string;
  search?: string;
  correlationId?: string;
  limit?: number;
};

export async function fetchLogs(query: LogQuery, signal?: AbortSignal) {
  const { data } = await apiRequest<LogRecord[]>("/logs", { query, signal });
  return data;
}
