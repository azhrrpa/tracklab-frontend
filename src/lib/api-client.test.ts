import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, buildUrl, onUnauthorized } from "@/lib/api-client";

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  // A new Response per call: a body can only be read once.
  const fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...headers },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized(null);
});

describe("buildUrl", () => {
  it("prefixes /api and skips empty query values", () => {
    expect(buildUrl("/trackers", { offset: 0, limit: 10, search: "", sortBy: undefined })).toBe("/api/trackers?offset=0&limit=10");
  });
});

describe("apiRequest", () => {
  it("sends the CSRF header only on state-changing requests", async () => {
    const fetchMock = mockFetch(200, { ok: true });

    await apiRequest("/trackers");
    await apiRequest("/trackers", { method: "POST", body: { code: "A" } });

    const getHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    const postHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(getHeaders["X-Requested-With"]).toBeUndefined();
    expect(postHeaders["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(postHeaders["Content-Type"]).toBe("application/json");
    expect(postHeaders["X-Correlation-Id"]).toMatch(/^[0-9a-f]{32}$/);
  });

  it("turns validation ProblemDetails into a readable ApiError", async () => {
    mockFetch(400, {
      title: "One or more validation errors occurred.",
      status: 400,
      errors: { Code: ["Code may only contain letters, numbers, '-' and '_'."] },
      traceId: "abc123",
    });

    const error = await apiRequest("/trackers", { method: "POST", body: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe("Code may only contain letters, numbers, '-' and '_'.");
    expect(error.traceId).toBe("abc123");
  });

  it("calls the unauthorized handler on 401", async () => {
    mockFetch(401, { title: "Session expired", detail: "Your session has expired. Please log in again." });
    const handler = vi.fn();
    onUnauthorized(handler);

    await expect(apiRequest("/trackers")).rejects.toThrow("Your session has expired");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not redirect when the login itself fails", async () => {
    mockFetch(401, { detail: "Incorrect username or password." });
    const handler = vi.fn();
    onUnauthorized(handler);

    await expect(apiRequest("/auth/login", { method: "POST", body: {} })).rejects.toThrow("Incorrect username or password.");
    expect(handler).not.toHaveBeenCalled();
  });

  it("reports a friendly error when the server can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await apiRequest("/trackers").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
  });
});
