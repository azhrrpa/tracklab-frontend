import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, fromDateInput, shortId, toDateInput } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats rupiah like the design (Rp 400.000,00)", () => {
    expect(formatCurrency(400000)).toBe("Rp 400.000,00");
    expect(formatCurrency(1)).toBe("Rp 1,00");
  });

  it("shows a dash for missing values", () => {
    expect(formatCurrency(null)).toBe("-");
    expect(formatCurrency("not a number")).toBe("-");
  });
});

describe("dates", () => {
  it("formats ISO dates as '20 Jun 2025'", () => {
    expect(formatDate("2025-06-20T00:00:00")).toBe("20 Jun 2025");
    expect(formatDate(null)).toBe("-");
    expect(formatDate("garbage")).toBe("-");
    expect(formatDate("0001-01-01T00:00:00")).toBe("-");
    expect(toDateInput("0001-01-01T00:00:00Z")).toBe("");
  });

  it("round-trips <input type=date> values", () => {
    expect(fromDateInput("2025-06-23")).toBe("2025-06-23T00:00:00Z");
    expect(fromDateInput("")).toBeNull();
    expect(toDateInput("2025-06-23T10:00:00")).toBe("2025-06-23");
  });
});

describe("shortId", () => {
  it("shows a compact uppercase id", () => {
    expect(shortId("bfece3ab-41ad-4522-9a0f-000000000000", 8)).toBe("BFECE3AB…");
    expect(shortId(null)).toBe("-");
  });
});
