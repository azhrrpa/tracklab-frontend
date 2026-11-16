import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/features/auth/login-form";
import { readPermissions } from "@/features/auth/permissions";
import { buildTimeline } from "@/features/requests/request-detail";
import { requestSchema, toRequestBody, toRequestFormValues } from "@/features/requests/request-form";
import { companyName, partnerOptions } from "@/features/requests/request-helpers";
import { toAdvancedFilter } from "@/features/requests/requests-page";
import { trackerFromTracking } from "@/features/trackings/trackings-page";
import { normalizeIconName, resolveIcon } from "@/features/trackers/tracker-icon";
import { normalizeNewTracker, toTrackerFormValues, trackerSchema } from "@/features/trackers/tracker-form";
import type { LabRequest, Tracker, Tracking } from "@/lib/types";

const tracker = (overrides: Partial<Tracker>): Tracker => ({
  id: "t",
  code: "REQ-CREATE",
  description: "Created Request",
  actionType: "none",
  moduleFlow: "CA",
  isUsingNotification: false,
  isPublic: true,
  order: 0,
  isParallel: false,
  ...overrides,
});

describe("tracker form", () => {
  it("trims the code, keeps existing lowercase codes, and uppercases new ones", () => {
    const result = trackerSchema.parse({ ...toTrackerFormValues(), code: "  dika ", description: "Shared data" });
    expect(result.code).toBe("dika");
    expect(normalizeNewTracker({ ...result, code: "sample-sent", moduleFlow: "ca" })).toMatchObject({ code: "SAMPLE-SENT", moduleFlow: "CA" });
  });

  it("rejects invalid input with readable messages", () => {
    const result = trackerSchema.safeParse({ ...toTrackerFormValues(), code: "bad code!", description: "", order: -1 });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain("Use letters, numbers, '-', '_' or '.' only (e.g. REQ-CREATE)");
    expect(messages).toContain("Description is required");
    expect(messages).toContain("Must be 0 or more");
  });
});

describe("request form", () => {
  const valid = { ...toRequestFormValues(), partnerId: "93f25c4d-f903-b587-9671-66d4fb302c67", projectCode: "PRJ-1" };

  it("requires a valid partner id", () => {
    expect(requestSchema.safeParse({ ...valid, partnerId: "not-a-guid" }).success).toBe(false);
    expect(requestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a completed date before the start date", () => {
    const result = requestSchema.safeParse({ ...valid, analysisWipDate: "2025-06-10", analysisCompletedDate: "2025-06-01" });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path).toEqual(["analysisCompletedDate"]);
  });

  it("sends dates as ISO strings and only includes isActive when editing", () => {
    const body = toRequestBody({ ...valid, receivedDate: "2025-06-23" }, false);
    expect(body.receivedDate).toBe("2025-06-23T00:00:00Z");
    expect(body).not.toHaveProperty("isActive");
    expect(toRequestBody(valid, true)).toHaveProperty("isActive", true);
  });

  it("lists each partner once, by name", () => {
    const requests = [
      { id: "1", partnerId: "p1", partnerName: "PT B", projectCode: "A", totalFee: 0 },
      { id: "2", partnerId: "p1", partnerName: "PT B", projectCode: "B", totalFee: 0 },
      { id: "3", partnerId: "p2", partnerName: "PT A", projectCode: "C", totalFee: 0 },
    ] as LabRequest[];
    expect(partnerOptions(requests)).toEqual([
      { id: "p2", name: "PT A" },
      { id: "p1", name: "PT B" },
      { id: "93f25c4d-f903-b587-9671-66d4fb302c67", name: "PT KALBE FARMA TBK" },
    ]);
  });
});

describe("request filter", () => {
  it("builds an include filter from the non-empty fields only", () => {
    expect(toAdvancedFilter({ projectCode: " PRJ-1||PRJ-2 ", lastStatus: "", receivingStatus: "", operator: "OR" })).toEqual({
      include: { project_code: "PRJ-1||PRJ-2" },
      operator: "OR",
    });
  });
});

describe("tracking timeline", () => {
  it("orders steps and marks the reached ones", () => {
    const trackers = [
      tracker({ id: "b", code: "REQ-SUBMIT", order: 1 }),
      tracker({ id: "a", code: "REQ-CREATE", order: 0 }),
      tracker({ id: "x", code: "OLD", order: 2, isActive: false }),
    ];
    const trackings = [{ id: "k", trackerId: "a", requestId: "r", partnerId: "p" }] as Tracking[];

    const timeline = buildTimeline(trackers, trackings);

    expect(timeline.map((step) => step.tracker.code)).toEqual(["REQ-CREATE", "REQ-SUBMIT"]);
    expect(timeline[0].tracking?.id).toBe("k");
    expect(timeline[1].tracking).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("only allows paths inside this app", () => {
    expect(safeNextPath("/requests?page=2")).toBe("/requests?page=2");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/login")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});

describe("tracker icons", () => {
  it("normalises the icon name styles found in the real data", () => {
    expect(normalizeIconName("CheckCircle2")).toBe("check-circle-2");
    expect(normalizeIconName("fa-check")).toBe("check");
    expect(normalizeIconName("fa-solid fa-truck-fast")).toBe("truck-fast");
    expect(normalizeIconName("fas fa-check")).toBe("check");
    expect(normalizeIconName("")).toBeNull();
  });

  it("maps known names to an icon and unknown ones to the fallback", () => {
    expect(resolveIcon("CheckCircle2")).toBe(resolveIcon("circle-check"));
    expect(resolveIcon("fa-check")).toBe(resolveIcon("check"));
    expect(resolveIcon("unknown-icon")).toBe(resolveIcon(null));
  });
});

describe("permissions from /auth/authorization", () => {
  const authorization = {
    data: {
      moduleAccesses: [
        { roleCode: "ASSESSMENT-USER", moduleCode: "API-TRACKER", read: true, create: true, update: true, delete: false },
        { roleCode: "AUDITOR", moduleCode: "API-TRACKER", read: true, create: false, update: false, delete: true },
      ],
    },
  };

  it("combines all roles for the resource's module", () => {
    expect(readPermissions(authorization, "trackers")).toEqual({ read: true, create: true, update: true, delete: true });
  });

  it("is read-only for a module the user has no access entry for", () => {
    expect(readPermissions(authorization, "requests")).toEqual({ read: true, create: false, update: false, delete: false });
  });

  it("doesn't hide anything while the authorization data is unknown", () => {
    expect(readPermissions(undefined, "trackings").create).toBe(true);
  });
});

describe("company name", () => {
  it("uses the known partner list when the API only sends partnerId", () => {
    const request = { id: "r", partnerId: "93f25c4d-f903-b587-9671-66d4fb302c67", projectCode: "A", totalFee: 0 } as LabRequest;
    expect(companyName(request)).toBe("PT KALBE FARMA TBK");
    expect(companyName({ ...request, partnerId: "aaaaaaaa-0000-0000-0000-000000000000" })).toBe("Partner AAAAAAAA…");
  });
});

describe("trackings with joined tracker fields", () => {
  it("rebuilds the step from the tracking row when the tracker itself is gone", () => {
    const row = {
      id: "k",
      trackerId: "t",
      requestId: "r",
      partnerId: "p",
      trackerCode: "WIN-7894",
      trackerDescription: "Tes Dare123",
      trackerActionType: "none",
      trackerIcon: "dna",
      trackerOrder: 5,
    } as Tracking;

    expect(trackerFromTracking(row)).toMatchObject({ code: "WIN-7894", description: "Tes Dare123", icon: "dna", order: 5 });
    expect(trackerFromTracking({ id: "x", trackerId: "t", requestId: "r", partnerId: "p" })).toBeUndefined();
  });
});
