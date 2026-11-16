/**
 * Small fetch wrapper for the TrackLab backend.
 * - Calls go to /api/* on this origin (Next.js forwards them to the .NET backend).
 * - Adds the CSRF header the backend requires on POST/PUT/DELETE.
 * - Sends an X-Correlation-Id so a frontend error can be matched to backend log lines.
 * - Turns error responses (ProblemDetails JSON) into an ApiError with a readable message.
 */

export type ValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly title?: string,
    readonly errors?: ValidationErrors,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

export type ApiResponse<T> = {
  data: T;
  headers: Headers;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
};

let unauthorizedHandler: (() => void) | null = null;

/** Lets the app decide what happens on 401 (e.g. go to the login page). */
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function newCorrelationId() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function buildUrl(path: string, query?: RequestOptions["query"]) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `/api${path}${qs ? `?${qs}` : ""}`;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Correlation-Id": newCorrelationId(),
  };

  if (method !== "GET") {
    headers["X-Requested-With"] = "XMLHttpRequest";
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "Cannot reach the server. Check your connection and that the backend is running.");
  }

  const text = await response.text();
  const json = text ? safeParse(text) : undefined;

  if (!response.ok) {
    const error = toApiError(response.status, json, response.headers.get("X-Correlation-Id") ?? undefined);
    if (error.isUnauthorized && unauthorizedHandler && !path.startsWith("/auth/login")) {
      unauthorizedHandler();
    }
    throw error;
  }

  return { data: json as T, headers: response.headers };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function toApiError(status: number, body: unknown, traceId?: string): ApiError {
  const problem = (body ?? {}) as {
    title?: string;
    detail?: string;
    message?: string;
    errors?: ValidationErrors;
    traceId?: string;
  };

  const firstValidationMessage = problem.errors ? Object.values(problem.errors).flat()[0] : undefined;
  const message =
    firstValidationMessage ??
    problem.detail ??
    problem.message ??
    problem.title ??
    (status >= 500 ? "Something went wrong on the server." : `Request failed (${status}).`);

  return new ApiError(status, message, problem.title, problem.errors, problem.traceId ?? traceId);
}
